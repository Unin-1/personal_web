import assert from "node:assert/strict";
import test from "node:test";
import { emptySnapshot, fetchJson, syncExternalData, validateExternalConfig } from "../scripts/sync-external-data.mjs";
import { applyBilibiliOverrides, mergeProjectMetadata } from "../src/data/external-data.ts";

const now = "2026-10-15T08:00:00.000Z";
const oldTime = "2026-10-14T08:00:00.000Z";
const config = (repos = [], uid = "") => ({ github: { repositories: repos }, bilibili: { uid, overrides: {} } });
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const repository = (name) => ({ name, private: false, description: "A public project", language: "Astro", stargazers_count: 3 });
const anime = (id = 10) => ({ media_id: id, season_id: id + 100, title: `作品 ${id}`, cover: "http://example.com/cover.jpg", season_type: 1, new_ep: { index_show: "更新至 12 集" } });
const successRepo = { repo: "owner/old", name: "Old", description: "Saved", language: "JS", stars: 4, url: "https://github.com/owner/old", status: "fresh", lastAttemptAt: oldTime, lastSuccessAt: oldTime };

test("empty UID makes no external requests and cannot reuse another user's items", async () => {
  const previous = emptySnapshot();
  previous.bilibili = { uid: "123", items: [anime()], status: "fresh", lastSuccessAt: oldTime };
  const result = await syncExternalData({ config: config(), previous, now, fetchImpl: () => { throw new Error("Unexpected request"); } });
  assert.equal(result.bilibili.status, "unconfigured");
  assert.deepEqual(result.bilibili.items, []);
});

test("validates selected repo names, public UID, and manual progress", () => {
  for (const invalid of ["https://github.com/owner/repo", "owner/repo?x=y", "../repo", "owner/repo/extra"]) {
    assert.throws(() => validateExternalConfig(config([invalid])));
  }
  assert.throws(() => validateExternalConfig(config([], "abc")));
  const invalidProgress = config();
  invalidProgress.bilibili.overrides = { 123: { watchedEpisodes: -1 } };
  assert.throws(() => validateExternalConfig(invalidProgress));
  invalidProgress.bilibili.overrides = { 123: { status: "watching", watchedEpisodes: 0 } };
  assert.doesNotThrow(() => validateExternalConfig(invalidProgress));
});

test("one failed GitHub repo preserves its own snapshot while another updates", async () => {
  const previous = emptySnapshot();
  previous.github.repositories["owner/old"] = successRepo;
  const result = await syncExternalData({ config: config(["owner/old", "owner/new"]), previous, now, retries: 0,
    fetchImpl: async (url) => url.endsWith("/old") ? response({}, 503) : response(repository("New")),
  });
  assert.equal(result.github.repositories["owner/old"].status, "stale");
  assert.equal(result.github.repositories["owner/old"].stars, 4);
  assert.equal(result.github.repositories["owner/old"].lastSuccessAt, oldTime);
  assert.equal(result.github.repositories["owner/new"].status, "fresh");
  assert.equal(result.github.repositories["owner/new"].lastSuccessAt, now);
});

test("first GitHub failure is unavailable and does not fabricate a zero star result", async () => {
  const result = await syncExternalData({ config: config(["owner/missing"]), now, retries: 0, fetchImpl: async () => response({}, 404) });
  const snapshot = result.github.repositories["owner/missing"];
  assert.equal(snapshot.status, "unavailable");
  assert.equal(snapshot.lastSuccessAt, null);
  const merged = mergeProjectMetadata({ title: "", repo: "owner/missing", description: "", language: "", link: [] }, snapshot);
  assert.equal(merged.stars, undefined);
});

test("manual metadata, optional status, and explicitly zero stars win over GitHub", () => {
  const project = { title: "Local title", description: "Local intro", repo: "owner/old", language: "TS", stars: 0, status: "", link: [{ label: "Demo", icon: "", value: "https://example.com" }] };
  const merged = mergeProjectMetadata(project, successRepo);
  assert.equal(merged.title, "Local title");
  assert.equal(merged.description, "Local intro");
  assert.equal(merged.stars, 0);
  assert.equal(merged.status, "");
  assert.deepEqual(merged.link, project.link);
});

test("finite retries recover then stop and provide abort signals", async () => {
  let calls = 0;
  const result = await fetchJson("https://example.com", { wait: async () => {}, fetchImpl: async (_url, { signal }) => {
    assert.ok(signal instanceof AbortSignal);
    calls += 1;
    return calls === 1 ? response({}, 503) : response({ success: true });
  } });
  assert.equal(calls, 2);
  assert.deepEqual(result, { success: true });
  calls = 0;
  await assert.rejects(fetchJson("https://example.com", { retries: 1, wait: async () => {}, fetchImpl: async () => { calls += 1; throw new Error("offline"); } }));
  assert.equal(calls, 2);
});

test("timeout aborts an unavailable source", async () => {
  await assert.rejects(fetchJson("https://example.com", { timeoutMs: 5, retries: 0, fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
    const keepAlive = setTimeout(() => reject(new Error("Timeout did not abort")), 500);
    signal.addEventListener("abort", () => { clearTimeout(keepAlive); reject(signal.reason); }, { once: true });
  }) }), { name: "TimeoutError" });
});

test("Bilibili paginates both lists, deduplicates, and keeps release information separate", async () => {
  const urls = [];
  const result = await syncExternalData({ config: config([], "123"), now, retries: 0, fetchImpl: async (rawUrl) => {
    const url = new URL(rawUrl);
    urls.push(url);
    const type = url.searchParams.get("type");
    const page = url.searchParams.get("pn");
    const list = type === "2" ? [] : page === "1" ? Array.from({ length: 30 }, (_, index) => anime(index + 1)) : [anime(31)];
    return response({ code: 0, data: { list, total: type === "2" ? 0 : 31 } });
  } });
  assert.equal(urls.length, 3);
  assert.equal(result.bilibili.items.length, 31);
  assert.equal(result.bilibili.status, "fresh");
  const [item] = applyBilibiliOverrides(result.bilibili.items, { 1: { watchedEpisodes: 4, status: "watching" } });
  assert.equal(item.epStatus, "更新至 12 集");
  assert.equal(item.watchedEpisodes, 4);
  assert.equal(item.status, "watching");
  assert.equal(item.poster, "https://example.com/cover.jpg");
});

test("Bilibili page/API failure retains complete last-success snapshot and timestamp", async () => {
  const previous = emptySnapshot();
  previous.bilibili = { uid: "123", items: [{ id: 7, title: "Saved item" }], status: "fresh", lastSuccessAt: oldTime };
  let calls = 0;
  const result = await syncExternalData({ config: config([], "123"), previous, now, retries: 0, fetchImpl: async () => {
    calls += 1;
    return calls === 1 ? response({ code: 0, data: { list: Array.from({ length: 30 }, (_, index) => anime(index + 1)), total: 31 } }) : response({ code: -412 });
  } });
  assert.equal(result.bilibili.status, "stale");
  assert.equal(result.bilibili.lastSuccessAt, oldTime);
  assert.deepEqual(result.bilibili.items, previous.bilibili.items);
});

test("a changed UID cannot inherit a previous UID's successful data", async () => {
  const previous = emptySnapshot();
  previous.bilibili = { uid: "old", items: [anime()], status: "fresh", lastSuccessAt: oldTime };
  const result = await syncExternalData({ config: config([], "999"), previous, now, retries: 0, fetchImpl: async () => response({ code: -403 }) });
  assert.equal(result.bilibili.status, "unavailable");
  assert.deepEqual(result.bilibili.items, []);
  assert.equal(result.bilibili.lastSuccessAt, null);
});

test("successful empty collection replaces old data rather than becoming stale", async () => {
  const previous = emptySnapshot();
  previous.bilibili = { uid: "123", items: [anime()], status: "fresh", lastSuccessAt: oldTime };
  const result = await syncExternalData({ config: config([], "123"), previous, now, fetchImpl: async () => response({ code: 0, data: { list: [], total: 0 } }) });
  assert.equal(result.bilibili.status, "fresh");
  assert.equal(result.bilibili.lastSuccessAt, now);
  assert.deepEqual(result.bilibili.items, []);
});

test("GitHub token is sent only to GitHub and is absent from saved data", async () => {
  const result = await syncExternalData({ config: config(["owner/repo"], "123"), now, githubToken: "test-secret", fetchImpl: async (url, { headers }) => {
    if (url.startsWith("https://api.github.com/")) {
      assert.equal(headers.Authorization, "Bearer test-secret");
      return response(repository("Repo"));
    }
    assert.equal(headers.Authorization, undefined);
    return response({ code: 0, data: { list: [], total: 0 } });
  } });
  assert.equal(JSON.stringify(result).includes("test-secret"), false);
});
