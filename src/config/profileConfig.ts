import type { ProfileConfig } from "../types/profileConfig";

export const profileConfig: ProfileConfig = {
  avatar: "/assets/images/unin-avatar.svg",
  name: "Unin",
  bio: "代码、风景与二次元。在平凡的日子里，收集一点闪光。",
  links: [
    { name: "GitHub", icon: "fa7-brands:github", url: "https://github.com/Unin-1", showName: true },
    { name: "RSS", icon: "fa7-solid:rss", url: "/rss/", showName: false },
  ],
};
