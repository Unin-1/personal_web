import type { MusicPlayerConfig } from "../types/musicConfig";

// Local files belong in public/assets/music/. See docs/content-guide.md.
export const musicPlayerConfig: MusicPlayerConfig = {
  showInNavbar: true,
  showInSidebar: true,
  mode: "local",
  volume: 0.5,
  playMode: "list",
  showLyrics: true,
  meting: { api: "", server: "netease", type: "playlist", id: "", auth: "", fallbackApis: [] },
  local: { playlist: [] },
};
