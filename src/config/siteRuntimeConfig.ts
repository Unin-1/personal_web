import { siteConfig as defaults } from "./siteConfig";
import { layoutConfig } from "../utils/layout-config";
import type { SiteConfig } from "../types/siteConfig";

// The Astro toolchain reads siteConfig.ts without depending on editable JSON.
// Page rendering uses this adapter, so layout saves use HMR instead of restarting Vite.
export const siteConfig: SiteConfig = {
  ...defaults,
  themeColor: { ...defaults.themeColor, hue: layoutConfig.visual.hue },
  pageWidth: layoutConfig.visual.pageWidth,
  postListLayout: { ...defaults.postListLayout, defaultMode: layoutConfig.visual.postListMode },
};
