import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { createMusicSource } from "../src/utils/music-source.mjs";

const source = createMusicSource();
const meting = { api: "https://primary.example/api?server=:server&type=:type&id=:id&auth=:auth&r=:r", fallbackApis: ["https://backup.example/api?server=:server&type=:type&id=:id"], server: "netease", type: "playlist", id: "123", auth: "" };
const response = (data) => ({ ok: true, json: async () => data });

test("inline LRC stays content while local paths receive the Pages base", () => {
  const lrc = "[00:01.00]第一句\n[00:02]第二句";
  const withBase = (value) => `/personal_web/${value.replace(/^\//, "")}`;
  const tracks = source.localPlaylist([
    { name: "本地歌曲", url: "/assets/song.mp3", cover: "/assets/cover.webp", lrc },
    { name: "另一首", url: "https://media.example/song.mp3", lrc: "/assets/lyrics.lrc" },
  ], withBase);
  assert.equal(tracks[0].url, "/personal_web/assets/song.mp3");
  assert.equal(tracks[0].pic, "/personal_web/assets/cover.webp");
  assert.equal(tracks[0].lrc, lrc);
  assert.equal(tracks[1].lrc, "/personal_web/assets/lyrics.lrc");
  assert.equal(tracks[1].url, "https://media.example/song.mp3");
});

test("every Meting placeholder is URL encoded, including auth and repeated fields", () => {
  const config = { ...meting, id: "关键词 & 中文?", auth: "public&auth=value" };
  const url = new URL(source.metingUrl(`${meting.api}&again=:id`, config, 0.5));
  assert.equal(url.searchParams.get("id"), config.id);
  assert.equal(url.searchParams.get("again"), config.id);
  assert.equal(url.searchParams.get("auth"), config.auth);
  assert.equal(url.searchParams.get("r"), "0.5");
  assert.equal(url.searchParams.get("server"), "netease");
  assert.equal(url.searchParams.get("type"), "playlist");
  const fallback = new URL(source.metingUrl(meting.fallbackApis[0], config));
  assert.equal(fallback.searchParams.get("auth"), config.auth);
});

test("rejects invalid media protocols and broken playlists", () => {
  const tracks = source.normalizeTracks([
    { url: "javascript:alert(1)" }, { url: "data:audio/mp3,123" },
    { url: "/relative-to-api.mp3" }, { url: null }, null,
    { title: "Valid", url: "https://media.example/song.mp3", pic: "javascript:invalid" },
  ]);
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].name, "Valid");
  assert.equal(tracks[0].pic, "");
  assert.equal(source.mediaUrl("file:///private.mp3", true), "");
  assert.equal(source.mediaUrl("/safe\\unsafe.mp3", true), "");
});

test("Meting times out and proceeds to the backup without exposing auth", async () => {
  const requests = [];
  const result = await source.metingPlaylist({ ...meting, auth: "public-parameter" }, {
    timeoutMs: 5,
    fetchImpl: async (url, options) => {
      requests.push(url);
      assert.equal(options.credentials, "omit");
      if (url.includes("primary.example")) return new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
      return response([{ title: "Backup song", author: "Artist", url: "https://media.example/track.mp3" }]);
    },
  });
  assert.equal(requests.length, 2);
  assert.equal(result[0].name, "Backup song");
});

test("empty config, empty playlists and all failed endpoints have explicit errors", async () => {
  await assert.rejects(source.metingPlaylist(undefined), /请配置音乐来源和歌单 ID/);
  await assert.rejects(source.metingPlaylist({ ...meting, api: "", fallbackApis: [] }), /请配置音乐 API 地址/);
  await assert.rejects(source.metingPlaylist(meting, { fetchImpl: async () => response([]) }), /歌单为空/);
  await assert.rejects(source.metingPlaylist({ ...meting, auth: "do-not-log" }, { fetchImpl: async () => { throw new Error("do-not-log"); } }), (error) => !error.message.includes("do-not-log") && error.message.includes("暂时不可用"));
});

async function mountManager(config) {
  const file = await readFile(new URL("../src/components/features/MusicManager.astro", import.meta.url), "utf8");
  const script = file.match(/<script is:inline data-swup-ignore-script define:vars=\{\{ managerConfigStr \}\}>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  const events = [];
  const audioEvents = {};
  let audioCount = 0;
  let playCalls = 0;
  const audio = {
    style: {}, paused: true, duration: 0, currentTime: 0,
    pause() { this.paused = true; },
    async play() { playCalls += 1; this.paused = false; },
    addEventListener(name, listener) { audioEvents[name] = listener; },
  };
  const context = vm.createContext({
    window: { __fireflyMusicSource: source, dispatchEvent(event) { events.push(event); } },
    document: { createElement() { audioCount += 1; return audio; }, body: { appendChild() {} } },
    localStorage: { getItem() { throw new Error("Private mode"); }, setItem() { throw new Error("Private mode"); } },
    managerConfigStr: JSON.stringify({ volume: 0, i18n: { noSongs: "歌单为空", error: "音乐加载失败" }, ...config }),
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
    AbortSignal, setTimeout, clearTimeout, console,
  });
  vm.runInContext(script, context);
  return { context, script, events, audioEvents, audio, counts: () => ({ audioCount, playCalls }) };
}

test("manager remains singleton, never autoplays on init or paused media errors", async () => {
  const mounted = await mountManager({ mode: "local", localPlaylist: [{ name: "Song", url: "/assets/song.mp3", lrc: "[00:01.00]歌词" }] });
  const manager = mounted.context.window.__fireflyMusic;
  await manager.init();
  assert.equal(manager.getState().volume, 0);
  assert.equal(manager.getState().lyrics[0].text, "歌词");
  assert.equal(mounted.counts().playCalls, 0);
  vm.runInContext(mounted.script, mounted.context);
  assert.equal(mounted.context.window.__fireflyMusic, manager);
  assert.equal(mounted.counts().audioCount, 1);
  mounted.audioEvents.error();
  assert.equal(mounted.counts().playCalls, 0);
  manager.togglePlay();
  await Promise.resolve();
  assert.equal(mounted.counts().playCalls, 1);
  assert.equal(manager.getState().isPlaying, true);
});

test("empty local playlists retain a clear error in the public manager state", async () => {
  const mounted = await mountManager({ mode: "local", localPlaylist: [] });
  await mounted.context.window.__fireflyMusic.init();
  assert.equal(mounted.context.window.__fireflyMusic.getState().error, "歌单为空");
  assert.equal(mounted.counts().playCalls, 0);
});

test("successful retry clears the manager error and restores the current song UI event", async () => {
  const mounted = await mountManager({ mode: "local", localPlaylist: [{ name: "Recovered song", url: "/assets/song.mp3" }] });
  const manager = mounted.context.window.__fireflyMusic;
  await manager.init();
  mounted.audio.play = async () => { throw new Error("Temporary playback failure"); };
  manager.togglePlay();
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(manager.getState().error);
  assert.equal(mounted.events.at(-1).type, "fm:error");

  mounted.audio.play = async () => { mounted.audio.paused = false; };
  manager.togglePlay();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(manager.getState().error, null);
  assert.equal(manager.getState().isPlaying, true);
  assert.equal(mounted.events.at(-2).type, "fm:track");
  assert.equal(mounted.events.at(-2).detail.track.name, "Recovered song");
  assert.equal(mounted.events.at(-1).type, "fm:play-state");
});

test("playlist request failure can be retried without refreshing or autoplaying", async () => {
  let attempts = 0;
  const retrySource = { ...source, async metingPlaylist() {
    attempts += 1;
    if (attempts === 1) throw new Error("音乐服务暂时不可用");
    return [{ name: "Recovered playlist", url: "https://media.example/song.mp3" }];
  } };
  const mounted = await mountManager({ mode: "meting", meting });
  mounted.context.window.__fireflyMusicSource = retrySource;
  // The manager captures its source once at mount, just as it does in the browser.
  delete mounted.context.window.__fireflyMusic;
  vm.runInContext(mounted.script, mounted.context);
  const manager = mounted.context.window.__fireflyMusic;
  await manager.init();
  assert.ok(manager.getState().error);
  manager.togglePlay();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(attempts, 2);
  assert.equal(manager.getState().error, null);
  assert.equal(manager.getState().playlist[0].name, "Recovered playlist");
  assert.equal(mounted.counts().playCalls, 0);
});
