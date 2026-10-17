import type { ProfileConfig } from "../types/profileConfig";

export const profileConfig: ProfileConfig = {
  avatar: "/assets/images/avatar.webp",
  name: "独角Unin",
  bio: "\"もうじき夏が終わるから。\"",
  links: [
    { name: "GitHub", icon: "fa7-brands:github", url: "https://github.com/Unin-1", showName: true },
    { name: "bilibili", icon: "fa7-brands:bilibili", url: "https://space.bilibili.com/515140354?spm_id_from=333.1007.0.0", showName: true },
    { name: "RSS", icon: "fa7-solid:rss", url: "/rss/", showName: false },
  ],
};
