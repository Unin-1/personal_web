import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoPattern = /^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/;
const watchingStatuses = new Set(["planned", "watching", "completed", "on-hold", "dropped"]);

export function validateExternalConfig(config) {
  const repositories = config?.github?.repositories;
  if (!Array.isArray(repositories) || repositories.some((repo) =>
    typeof repo !== "string" || !repoPattern.test(repo))) {
    throw new Error("github.repositories 必须是 owner/repository 格式的公开仓库列表");
  }
  const uid = config?.bilibili?.uid;
  if (typeof uid !== "string" || (uid !== "" && !/^\d+$/.test(uid))) {
    throw new Error("bilibili.uid 必须为空或数字字符串");
  }
  const overrides = config?.bilibili?.overrides ?? {};
  if (!overrides || Array.isArray(overrides) || typeof overrides !== "object") {
    throw new Error("bilibili.overrides 必须为以 media_id 为键的对象");
  }
  for (const [id, value] of Object.entries(overrides)) {
    if (!/^\d+$/.test(id) || !value || typeof value !== "object" ||
      Object.keys(value).some((key) => !["watchedEpisodes", "status"].includes(key)) ||
      (value.watchedEpisodes !== undefined &&
        (!Number.isSafeInteger(value.watchedEpisodes) || value.watchedEpisodes < 0)) ||
      (value.status !== undefined && !watchingStatuses.has(value.status))) {
      throw new Error("追番手动记录仅支持非负整数 watchedEpisodes 和有效 status");
    }
  }
  return config;
}

export function emptySnapshot() {
  return {
    schemaVersion: 1,
    github: { repositories: {} },
    bilibili: {
      uid: "", items: [], status: "unconfigured",
      lastAttemptAt: null, lastSuccessAt: null,
    },
  };
}

/** Finite retries, bounded request and body time, and no credentials in saved output. */
export async function fetchJson(url, options = {}) {
  const {
    fetchImpl = fetch, timeoutMs = 5000, retries = 1,
    wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    headers = {}, validate = () => true,
  } = options;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers, signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!validate(data)) throw new Error("Unexpected API response");
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < retries) await wait(250 * (attempt + 1));
    }
  }
  throw lastError;
}

function repositoryData(repo, data) {
  if (data.private || !Number.isFinite(data.stargazers_count) || typeof data.name !== "string") {
    throw new Error("Unexpected repository data");
  }
  return {
    repo, name: data.name,
    description: typeof data.description === "string" ? data.description : "",
    language: typeof data.language === "string" ? data.language : "",
    stars: Math.max(0, Math.floor(data.stargazers_count)),
    url: `https://github.com/${repo}`,
  };
}

async function fetchBilibili(uid, options) {
  const all = [];
  for (const type of [1, 2]) {
    let totalPages = 1;
    for (let page = 1; page <= totalPages; page += 1) {
      const api = new URL("https://api.bilibili.com/x/space/bangumi/follow/list");
      api.search = new URLSearchParams({ type: String(type), vmid: uid, pn: String(page), ps: "30" }).toString();
      const json = await fetchJson(api.toString(), {
        ...options,
        validate: (data) => data?.code === 0 && Array.isArray(data?.data?.list) &&
          Number.isFinite(data?.data?.total) && data.data.total >= 0,
      });
      if (page === 1) {
        totalPages = Math.max(1, Math.ceil(json.data.total / 30));
        if (totalPages > 50) throw new Error("Bilibili list exceeds sync limit");
      }
      // A truncated response is a failed sync, never a successful empty replacement.
      const expectedItems = Math.min(30, Math.max(0, json.data.total - (page - 1) * 30));
      if (json.data.list.length !== expectedItems) {
        throw new Error("Incomplete Bilibili list");
      }
      all.push(...json.data.list);
    }
  }
  const seen = new Set();
  return all.map((item) => {
    if (!Number.isSafeInteger(item.media_id) || !Number.isSafeInteger(item.season_id) ||
      typeof item.title !== "string") throw new Error("Unexpected anime data");
    return {
      id: item.media_id,
      title: item.title,
      originalTitle: item.title,
      poster: /^https?:\/\//.test(item.cover || "") ? item.cover.replace(/^http:/, "https:") : null,
      type: item.season_type === 2 ? "movie" : "tv",
      season_type: Number(item.season_type) || 1,
      rating: Number(item.rating?.score) || 0,
      date: "",
      overview: String(item.evaluate || item.brief || ""),
      link: `https://www.bilibili.com/bangumi/play/ss${item.season_id}`,
      epStatus: String(item.new_ep?.index_show || ""),
    };
  }).filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export async function syncExternalData({
  config, previous = emptySnapshot(), now = new Date().toISOString(),
  githubToken = "", ...requestOptions
}) {
  validateExternalConfig(config);
  const result = emptySnapshot();
  const repositories = [...new Map(config.github.repositories.map((repo) => [repo.toLowerCase(), repo])).values()];
  for (const repo of repositories) {
    const key = repo.toLowerCase();
    const old = previous.github?.repositories?.[key];
    try {
      const data = await fetchJson(`https://api.github.com/repos/${repo}`, {
        ...requestOptions,
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
        },
      });
      result.github.repositories[key] = {
        ...repositoryData(repo, data), status: "fresh", lastAttemptAt: now, lastSuccessAt: now,
      };
    } catch {
      result.github.repositories[key] = {
        ...(old?.lastSuccessAt ? old : {
          repo, name: repo.split("/")[1], description: "", language: "", stars: 0,
          url: `https://github.com/${repo}`, lastSuccessAt: null,
        }),
        status: old?.lastSuccessAt ? "stale" : "unavailable", lastAttemptAt: now,
      };
    }
  }
  const uid = config.bilibili.uid;
  if (uid) {
    const old = previous.bilibili?.uid === uid ? previous.bilibili : null;
    try {
      result.bilibili = {
        uid, items: await fetchBilibili(uid, requestOptions), status: "fresh",
        lastAttemptAt: now, lastSuccessAt: now,
      };
    } catch {
      result.bilibili = {
        uid, items: old?.lastSuccessAt ? old.items : [],
        status: old?.lastSuccessAt ? "stale" : "unavailable",
        lastAttemptAt: now, lastSuccessAt: old?.lastSuccessAt ?? null,
      };
    }
  }
  return result;
}

export async function runSync(root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  const config = JSON.parse(await readFile(path.join(root, "config/external-sources.json"), "utf8"));
  const snapshotPath = path.join(root, "src/data/external-snapshot.json");
  let previous = emptySnapshot();
  try { previous = JSON.parse(await readFile(snapshotPath, "utf8")); } catch { /* First build. */ }
  const result = await syncExternalData({ config, previous, githubToken: process.env.GITHUB_TOKEN ?? "" });
  await mkdir(path.dirname(snapshotPath), { recursive: true });
  const temporaryPath = `${snapshotPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  await rename(temporaryPath, snapshotPath);
  for (const item of Object.values(result.github.repositories)) console.log(`[sync] GitHub ${item.repo}: ${item.status}`);
  console.log(`[sync] Bilibili: ${result.bilibili.status}`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runSync().catch((error) => { console.error(`[sync] ${error.message}`); process.exitCode = 1; });
}
