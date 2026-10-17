import { type NavBarConfig, type NavBarLink, type NavBarSearchConfig, NavBarSearchMethod } from "../types/navBarConfig";

export const LinkPresets: Record<string, NavBarLink> = {
  Home: { name: "首页", url: "/", icon: "material-symbols:home-rounded" },
  Archive: { name: "文章", url: "/archive/", icon: "material-symbols:article-outline" },
  Tags: { name: "标签", url: "/tags/", icon: "material-symbols:tag-rounded" },
  Gallery: { name: "相册", url: "/gallery/", icon: "material-symbols:photo-library-outline", pageKey: "gallery" },
  Projects: { name: "项目", url: "/projects/", icon: "material-symbols:code-rounded", pageKey: "projects" },
  Bilibili: { name: "追番", url: "/bilibili/", icon: "material-symbols:live-tv-rounded", pageKey: "bilibili" },
  Friends: { name: "友链", url: "/friends/", icon: "material-symbols:link-rounded", pageKey: "friends" },
  About: { name: "关于", url: "/about/", icon: "material-symbols:person-outline" },
};
export const navBarConfig: NavBarConfig = {
  links: [LinkPresets.Home, LinkPresets.Archive, LinkPresets.Gallery, LinkPresets.Projects, {
    name: "生活", url: "#", icon: "material-symbols:coffee-outline", children: [LinkPresets.Bilibili, LinkPresets.Friends, LinkPresets.About],
  }],
};
export const navBarSearchConfig: NavBarSearchConfig = { method: NavBarSearchMethod.PageFind };
