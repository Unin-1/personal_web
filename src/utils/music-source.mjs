/** Self-contained factory also embedded before the inline persistent music manager. */
export function createMusicSource() {
  function isInlineLrc(value) {
    return typeof value === "string" && (/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/.test(value) || /\[(ar|ti|al|by|offset):/i.test(value) || value.includes("\n"));
  }

  function mediaUrl(value, allowLocal = false) {
    if (typeof value !== "string" || !value.trim()) return "";
    // Reject control characters and backslashes before the URL parser normalizes them.
    if ([...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 || character === "\\")) return "";
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      try { return new URL(trimmed).href; } catch { return ""; }
    }
    if (trimmed.startsWith("//")) return mediaUrl(`https:${trimmed}`);
    if (allowLocal && !/^[a-z][a-z\d+.-]*:/i.test(trimmed) && !trimmed.startsWith("#") && !trimmed.startsWith("?")) return trimmed;
    return "";
  }

  function normalizeTracks(data, allowLocal = false) {
    if (!Array.isArray(data)) return [];
    return data.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const url = mediaUrl(item.url, allowLocal);
      if (!url) return [];
      const lrc = typeof item.lrc === "string" ? item.lrc : "";
      return [{
        name: String(item.name || item.title || "未命名歌曲"),
        artist: String(item.artist || item.author || "未知艺术家"),
        url,
        pic: mediaUrl(item.pic || item.cover, allowLocal),
        lrc: isInlineLrc(lrc) ? lrc : mediaUrl(lrc, allowLocal),
      }];
    });
  }

  function localPlaylist(playlist, withBase) {
    return normalizeTracks(playlist, true).map((song) => ({
      ...song,
      url: /^https?:\/\//i.test(song.url) ? song.url : withBase(song.url),
      pic: song.pic ? /^https?:\/\//i.test(song.pic) ? song.pic : withBase(song.pic) : "",
      lrc: !song.lrc || isInlineLrc(song.lrc) || /^https?:\/\//i.test(song.lrc) ? song.lrc : withBase(song.lrc),
    }));
  }

  function metingUrl(template, config, random = Math.random()) {
    if (!template || !config?.server || !config.type || !String(config.id || "").trim()) throw new Error("请配置音乐来源和歌单 ID");
    const values = { server: config.server, type: config.type, id: config.id, auth: config.auth || "", r: random };
    const replaced = template.replace(/:(server|type|id|auth|r)\b/g, (_match, key) => encodeURIComponent(String(values[key])));
    let url;
    try { url = new URL(replaced); } catch { throw new Error("音乐 API 地址无效"); }
    if (!/^https?:$/.test(url.protocol)) throw new Error("音乐 API 地址无效");
    if (config.auth && !template.includes(":auth")) url.searchParams.set("auth", config.auth);
    return url.href;
  }

  async function metingPlaylist(config, options = {}) {
    const { fetchImpl = fetch, timeoutMs = 8000 } = options;
    if (!config?.server || !config.type || !String(config.id || "").trim()) throw new Error("请配置音乐来源和歌单 ID");
    const apis = [...new Set([config.api, ...(config.fallbackApis || [])].filter((api) => typeof api === "string" && api.trim()))];
    if (!apis.length) throw new Error("请配置音乐 API 地址");
    let sawEmpty = false;
    for (const template of apis) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const url = metingUrl(template, config);
        const response = await fetchImpl(url, { signal: controller.signal, credentials: "omit" });
        if (!response.ok) throw new Error("音乐服务响应失败");
        const data = await response.json();
        const tracks = normalizeTracks(data);
        if (!tracks.length) { sawEmpty = true; continue; }
        return tracks;
      } catch { /* Try the next endpoint without logging client auth parameters. */ }
      finally { clearTimeout(timeout); }
    }
    throw new Error(sawEmpty ? "歌单为空或没有可播放的歌曲" : "音乐服务暂时不可用，请稍后重试");
  }

  return { isInlineLrc, mediaUrl, normalizeTracks, localPlaylist, metingUrl, metingPlaylist };
}
