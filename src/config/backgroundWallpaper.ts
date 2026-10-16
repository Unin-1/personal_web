import type { BackgroundWallpaperConfig } from "@/types/backgroundWallpaper";
import { layoutConfig } from "../utils/layout-config";

// Images and text can be edited visually with npm run edit, or in layout.json.
const visual = layoutConfig.visual;
export const backgroundWallpaper: BackgroundWallpaperConfig = {
  mode: visual.wallpaperMode,
  playerEnable: false,
  src: {
    desktop: visual.desktopImages.length ? visual.desktopImages : visual.desktopImage,
    mobile: visual.mobileImages.length ? visual.mobileImages : visual.mobileImage,
  },
  common: {
    dimOpacity: visual.dimOpacity,
    homeText: {
      enable: true,
      title: visual.title,
      subtitle: visual.subtitle,
      titleSize: "3.8rem",
      subtitleSize: "1.15rem",
      typewriter: { enable: false, speed: 100, deleteSpeed: 50, pauseTime: 2000 },
      linksEnable: true,
      links: [
        { name: "GitHub", icon: "fa7-brands:github", url: "https://github.com/Unin-1", showName: true },
        { name: "RSS", icon: "fa7-solid:rss", url: "/rss/", showName: true },
      ],
    },
    carousel: { enable: visual.carouselEnabled, interval: visual.carouselInterval, transitionEffect: visual.carouselEffect },
    waves: { enable: { desktop: false, mobile: false } },
    gradient: { enable: { desktop: true, mobile: true }, height: "20%" },
  },
  banner: { position: "center", postInfo: { mode: "description" }, navbar: { transparentMode: "semi", blur: 12 } },
  overlay: { zIndex: -1, opacity: 0.8, blur: visual.blur, cardOpacity: visual.cardOpacity },
  fullscreen: {
    layout: "hero",
    position: "center",
    navbar: { transparentMode: "semifull", blur: 12 },
    blurRamp: { enable: { desktop: true, mobile: true } },
  },
};
