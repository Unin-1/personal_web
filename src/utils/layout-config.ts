import storedLayout from "../config/layout.json";
import { validateLayout } from "../editor/schema.mjs";

export type HomeModuleId = "intro" | "featured" | "posts" | "projects" | "gallery" | "anime" | "links";
export type SidebarModuleId = "profile" | "announcement" | "music" | "categories" | "tags" | "stats" | "calendar" | "siteInfo" | "sidebarToc";
export interface LayoutConfig {
  version: 1;
  homeModules: { id: HomeModuleId; enabled: boolean }[];
  sidebar: {
    enabled: boolean;
    position: "left" | "right" | "both";
    left: { id: SidebarModuleId; enabled: boolean; sticky: boolean }[];
    right: { id: SidebarModuleId; enabled: boolean; sticky: boolean }[];
  };
  visual: {
    wallpaperMode: "banner" | "fullscreen" | "overlay" | "none";
    desktopImage: string;
    mobileImage: string;
    title: string;
    subtitle: string;
    dimOpacity: number;
    hue: number;
    pageWidth: number;
    cardOpacity: number;
    sidebarCardColorLight: string;
    sidebarCardColorDark: string;
    blur: number;
    postListMode: "list" | "grid";
  };
}

export const layoutConfig: LayoutConfig = validateLayout(storedLayout);
export const getHomeModules = () => layoutConfig.homeModules.filter((module) => module.enabled);
