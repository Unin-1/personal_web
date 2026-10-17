import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { siteConfig } from "@/config";
import { resolveProjectMetadata } from "@/utils/projects-utils";
import type { PublicSearchEntry } from "@/utils/search-utils";
import { getPostUrlBySlug, removeFileExtension, url } from "@/utils/url-utils";

function plainText(markdown = ""): string {
  return markdown
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`~>|[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const GET: APIRoute = async () => {
  const [posts, projects] = await Promise.all([
    getCollection("posts", ({ data }) => !data.draft && !data.password),
    siteConfig.pages.projects
      ? getCollection("projects", ({ data }) => !data.draft)
      : Promise.resolve([]),
  ]);
  const entries: PublicSearchEntry[] = [
    ...posts.map((entry) => ({
      url: getPostUrlBySlug(entry.id),
      title: entry.data.title,
      description: entry.data.description,
      content: plainText(entry.body),
      tags: entry.data.tags,
    })),
    ...projects.map((entry) => {
      const metadata = resolveProjectMetadata(entry.data);
      return {
        url: url(`/projects/${removeFileExtension(entry.id)}/`),
        title: metadata.title,
        description: metadata.description || "",
        content: plainText(entry.body),
        tags: metadata.tags || [],
      };
    }),
  ];
  return new Response(JSON.stringify(entries), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
