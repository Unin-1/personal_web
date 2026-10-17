import type { MusicPlayerConfig } from "../types/musicConfig";

// Local files belong in public/assets/music/. See docs/content-guide.md.
export const musicPlayerConfig: MusicPlayerConfig = {
  showInNavbar: true,
  showInSidebar: true,
  mode: "meting",
  volume: 0.5,
  playMode: "list",
  showLyrics: true,
  meting: { api: "https://api.i-meto.com/meting/api?server=:server&type=:type&id=:id&r=:r", server: "netease", type: "playlist", id: "5001867833", auth: "", fallbackApis: ["https://api.injahow.cn/meting/?server=:server&type=:type&id=:id"] },
  local: { playlist: [] },
};
