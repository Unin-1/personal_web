import type { SearchResult } from "@/global";
import { url } from "@/utils/url-utils";

export type PublicSearchEntry = {
  url: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
};

type Pagefind = NonNullable<Window["pagefind"]> & {
  options?: (options: { excerptLength: number }) => Promise<void>;
};

let pagefindLoading: Promise<Pagefind> | undefined;
let indexLoading: Promise<PublicSearchEntry[]> | undefined;
let pagefindRetryAfter = 0;

function withTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("Search request timed out")),
      8000,
    );
  });
  return Promise.race([operation, timeout]).finally(() => clearTimeout(timer));
}

async function loadPagefind(): Promise<Pagefind> {
  if (window.pagefind) return window.pagefind;
  if (!pagefindLoading) {
    const scriptUrl = url("/pagefind/pagefind.js");
    pagefindLoading = withTimeout(
      import(/* @vite-ignore */ scriptUrl).then(async (pagefind: Pagefind) => {
        await pagefind.options?.({ excerptLength: 20 });
        window.pagefind = pagefind;
        return pagefind;
      }),
    ).catch((error: unknown) => {
      pagefindLoading = undefined;
      throw error;
    });
  }
  return pagefindLoading;
}

async function loadPublicIndex(): Promise<PublicSearchEntry[]> {
  // Dev/editor content can change without restarting the browser.
  if (import.meta.env.DEV || !indexLoading) {
    indexLoading = fetch(url("/search-index.json"), {
      cache: import.meta.env.DEV ? "no-store" : "default",
      signal: AbortSignal.timeout(10000),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Search index could not be loaded");
        return (await response.json()) as PublicSearchEntry[];
      })
      .catch((error: unknown) => {
        indexLoading = undefined;
        throw error;
      });
  }
  return indexLoading;
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function excerptFor(entry: PublicSearchEntry, terms: string[]): string {
  const text = entry.description || entry.content;
  const firstMatch = normalize(text).indexOf(terms[0]);
  const start = Math.max(0, firstMatch - 35);
  return `${start > 0 ? "…" : ""}${escapeHtml(text.slice(start, start + 180))}${text.length > start + 180 ? "…" : ""}`;
}

/** One search path for the navbar and full results page, including local editing. */
export async function searchSite(keyword: string): Promise<SearchResult[]> {
  const query = keyword.trim();
  if (!query) return [];

  if (import.meta.env.PROD && Date.now() >= pagefindRetryAfter) {
    try {
      const pagefind = await loadPagefind();
      const response = await withTimeout(pagefind.search(query));
      if (response.results.length > 0) {
        return await withTimeout(
          Promise.all(response.results.map((item) => item.data())),
        );
      }
    } catch {
      // The public index also works when an index download fails or is blocked.
      pagefindRetryAfter = Date.now() + 30000;
    }
  }

  const entries = await loadPublicIndex();
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return entries
    .map((entry) => {
      const title = normalize(entry.title);
      const tags = normalize(entry.tags.join(" "));
      const content = normalize(
        `${entry.title} ${entry.description} ${entry.tags.join(" ")} ${entry.content}`,
      );
      return {
        entry,
        matches: terms.every((term) => content.includes(term)),
        score: terms.reduce(
          (score, term) =>
            score +
            (title.includes(term) ? 10 : 0) +
            (tags.includes(term) ? 3 : 0),
          0,
        ),
      };
    })
    .filter((item) => item.matches)
    .sort((a, b) => b.score - a.score)
    .map(({ entry }) => ({
      url: entry.url,
      meta: { title: entry.title },
      excerpt: excerptFor(entry, terms),
    }));
}
