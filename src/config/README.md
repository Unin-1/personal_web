# 配置入口

本目录保存网站配置，详细操作与逐字段说明统一维护在：

- [博客操作手册](../../docs/content-guide.md)：从零启动、工作台每个控件、所有常用内容、发布及排错。
- [完整配置参数字典](../../docs/configuration-reference.md)：每个字段的类型、值域、单位、用途、优先级和示例。
- [高级与可选功能](../../docs/advanced-configuration.md)：评论、统计、字体、特效、看板娘、图表与可选页面。

## 先选对文件

| 文件 | 修改内容 |
| --- | --- |
| `layout.json` | 首页模块、左右侧栏、壁纸模式／图片／轮换、页面宽度、色相、卡片背景等；也可用 `npm run edit` |
| `siteConfig.ts` | SEO、页面开关、导航外形、文章显示和阅读行为 |
| `profileConfig.ts` | 头像、姓名、简介、联系方式 |
| `navBarConfig.ts` | 菜单分组、顺序、链接、搜索方式 |
| `announcementConfig.ts`、`FooterConfig.html` | 公告、额外页脚HTML |
| `galleryConfig.ts`、`friendsConfig.ts` | 相册、照片说明、友链 |
| `musicConfig.ts` | 本地音乐／Meting、播放器显示 |
| `../content/` | 文章、项目、关于／友链说明等正文 |
| `../../config/external-sources.json` | GitHub公开仓库、B站UID、个人观看进度 |
| 其他 `*Config.ts` | 可选功能，详见高级配置 |

## 覆盖与生效

`layout.json` 是作者布局的唯一数据源。`siteRuntimeConfig.ts`、`sidebarConfig.ts`、`backgroundWallpaper.ts` 把它映射到页面；色相、宽度、文章默认布局以及壁纸相关映射值不要只在 `siteConfig.ts`／适配器里改静态默认。改错位置会看不到变化。

各配置有固定导入入口，复制一个不同名字的文件不会自动替换配置。类型文件在 `src/types/`，改类型本身不会改页面。

页面统一入口使用 `import { siteConfig, profileConfig } from "@/config"`；这会得到已合并layout的运行时配置。Astro构建工具有意读取不依赖layout的静态siteConfig，防止工作台保存导致开发服务器反复重启；维护普通配置不需要改这些导入。

工作台保存只写本地JSON；Markdown、一般配置在开发环境通常热更新，字体／代码渲染／图表插件与环境变量修改需要重启。生产站所有修改都需重新构建并部署。访客浏览器已有偏好可能覆盖站点默认，用无痕窗口检查。

`PUBLIC_DISPLAY_SETTINGS` 优先覆盖访客面板总开关，`PUBLIC_PAGES_<KEY>` 覆盖页面开关，`PUBLIC_SITE_LANG` 覆盖语言；完整取值见参数字典。工作台与访客面板独立，未开启的可选功能也不会因为存在配置文件就自动启用。
