/** Shared by the local editor, its write API, and the production config loader. */
export const HOME_MODULES = {
  intro: "欢迎与介绍", featured: "精选文章", posts: "最新文章",
  projects: "GitHub 项目", gallery: "相册速览", anime: "追番记录", links: "友链入口",
};
export const SIDEBAR_MODULES = {
  profile: "个人资料", announcement: "公告", music: "音乐播放器",
  categories: "文章分类", tags: "文章标签", stats: "站点统计",
  calendar: "日历", siteInfo: "站点信息", sidebarToc: "文章目录",
};

function object(value, keys, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} 必须是对象`);
  const actual = Object.keys(value);
  if (actual.some((key) => !keys.includes(key)) || keys.some((key) => !actual.includes(key))) {
    throw new Error(`${path} 字段不完整或包含未知字段`);
  }
}
function boolean(value, path) {
  if (typeof value !== "boolean") throw new Error(`${path} 必须为布尔值`);
}
function text(value, max, path) {
  if (typeof value !== "string" || !value.trim() || value.length > max || [...value].some((character) => character.charCodeAt(0) < 32)) {
    throw new Error(`${path} 必须是 1–${max} 字的单行文字`);
  }
}
function number(value, min, max, path) {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${path} 必须在 ${min}–${max} 之间`);
}
function image(value, path) {
  text(value, 2048, path);
  if (value.startsWith("https://")) {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) throw new Error(`${path} 不允许带账号的图片地址`);
    return;
  }
  const local = value.startsWith("/") ? value.slice(1) : value;
  if (!/^(assets|images)\/[\p{L}\p{N}_./% -]+\.(avif|webp|png|jpe?g|gif|svg)$/iu.test(local)
    || local.includes("..") || /%2e|%2f|%5c/i.test(local)) {
    throw new Error(`${path} 请选择 assets/、images/ 下的图片或 HTTPS 图片地址`);
  }
}
function modules(value, registry, sticky, path) {
  if (!Array.isArray(value) || value.length > Object.keys(registry).length) throw new Error(`${path} 模块列表无效`);
  for (const item of value) {
    object(item, sticky ? ["id", "enabled", "sticky"] : ["id", "enabled"], path);
    if (!Object.hasOwn(registry, item.id)) throw new Error(`${path} 包含未知模块`);
    boolean(item.enabled, `${path}.enabled`);
    if (sticky) boolean(item.sticky, `${path}.sticky`);
  }
}
function complete(value, registry, path) {
  const ids = value.map((item) => item.id);
  if (ids.length !== Object.keys(registry).length || new Set(ids).size !== ids.length) {
    throw new Error(`${path} 每个模块必须恰好出现一次；隐藏模块请关闭显示`);
  }
}

export function validateLayout(value) {
  object(value, ["version", "homeModules", "sidebar", "visual"], "layout");
  if (value.version !== 1) throw new Error("不支持的布局配置版本");
  modules(value.homeModules, HOME_MODULES, false, "homeModules");
  complete(value.homeModules, HOME_MODULES, "homeModules");
  object(value.sidebar, ["enabled", "position", "left", "right"], "sidebar");
  boolean(value.sidebar.enabled, "sidebar.enabled");
  if (!["left", "right", "both"].includes(value.sidebar.position)) throw new Error("侧栏位置无效");
  for (const side of ["left", "right"]) modules(value.sidebar[side], SIDEBAR_MODULES, true, `sidebar.${side}`);
  complete([...value.sidebar.left, ...value.sidebar.right], SIDEBAR_MODULES, "sidebar");
  object(value.visual, ["wallpaperMode", "desktopImage", "mobileImage", "title", "subtitle", "dimOpacity", "hue", "pageWidth", "cardOpacity", "blur", "postListMode"], "visual");
  if (!["banner", "fullscreen", "overlay", "none"].includes(value.visual.wallpaperMode)) throw new Error("壁纸模式无效");
  image(value.visual.desktopImage, "桌面图片");
  image(value.visual.mobileImage, "手机图片");
  text(value.visual.title, 100, "主标题");
  text(value.visual.subtitle, 250, "副标题");
  number(value.visual.dimOpacity, 0, 1, "遮罩暗度");
  number(value.visual.hue, 0, 360, "主题色相");
  number(value.visual.pageWidth, 60, 120, "页面宽度");
  number(value.visual.cardOpacity, 0.3, 1, "卡片不透明度");
  number(value.visual.blur, 0, 30, "背景模糊度");
  if (!["list", "grid"].includes(value.visual.postListMode)) throw new Error("文章默认布局无效");
  return value;
}
