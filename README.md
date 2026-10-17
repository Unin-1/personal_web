# Unin の Cafe

Unin 的二次元个人博客，使用 **Astro、Svelte 和 TypeScript** 构建，基于 Firefly 主题快照定制。文章、项目和配置保存在仓库中，由 GitHub Actions 构建为静态站点并发布到 GitHub Pages。

[访问网站](https://unin-1.github.io/personal_web/) · [操作手册](docs/content-guide.md) · [配置参数字典](docs/configuration-reference.md) · [架构与部署](docs/architecture.md)

## 功能

- **文章**：Markdown / MDX、图片、LaTeX 数学公式、标签与分类筛选、归档、搜索和 RSS。
- **个人展示**：相册与图片浏览、联系方式、友链、GitHub 项目；项目可标记为进行中、已完成或中断。
- **追番与音乐**：读取公开 Bilibili 追番记录，按作品名搜索，展示番剧更新与个人观看进度；音乐播放器支持本地文件和 Meting API，站内切换页面时继续播放。
- **布局与壁纸**：首页模块排序、左右侧栏编排与显隐；横幅、全屏、透明覆盖、纯色四种模式；桌面／手机独立图片列表、轮换间隔与过渡效果；遮罩暗度全站生效。
- **亮暗主题**：自定义主题色、页面宽度、正文卡片透明度和背景模糊；侧栏使用实色卡片，亮／暗模式可分别配色。关于页的欢迎终端逐字输入，结束后隐藏光标，配色随主题切换。
- **本地作者工作台**：拖动布局、调整视觉参数、即时预览桌面／手机并保存。编辑器和写入接口仅在本机作者模式启用，生产站点不包含管理入口。

自动轮换和终端动画尊重系统的“减少动态效果”设置；后台标签页暂停壁纸轮换。

## 界面预览

以下为功能示意，首页内容与壁纸以线上配置为准。

![作者工作台：壁纸模式、桌面与手机轮换列表、即时预览](docs/previews/wallpaper-workbench.webp)

| 关于页终端 · 浅色 | 关于页终端 · 深色 |
| --- | --- |
| ![浅色主题欢迎终端](docs/previews/about-terminal.webp) | ![深色主题欢迎终端](docs/previews/about-terminal-dark.webp) |

## 本地运行

使用 **Node.js 24**（见 [`.node-version`](.node-version)）和 **pnpm 11**（具体版本见 [`package.json`](package.json)）。

```sh
pnpm install --frozen-lockfile
npm run dev
```

普通开发预览：[http://localhost:4321/personal_web/](http://localhost:4321/personal_web/)。实际地址以终端输出为准。

编辑布局时，停止占用 4321 端口的普通开发服务器，再运行：

```sh
npm run edit
```

作者工作台：[http://127.0.0.1:4321/__editor/](http://127.0.0.1:4321/__editor/)。此模式的站点预览使用根路径 `/`；生产站点使用 `/personal_web/`。在工作台保存只会修改本地 `src/config/layout.json`，提交并合入 `main` 后才会发布。

| 命令 | 用途 |
| --- | --- |
| `npm run check` | Astro 与 TypeScript 诊断 |
| `npm run lint` | 本项目定制功能的只读 Biome 检查 |
| `npm test` | Node 行为与回归测试 |
| `npm run sync` | 更新公开 GitHub / Bilibili 数据快照 |
| `npm run build` | 同步数据、静态构建、搜索索引及发布产物检查 |
| `npm run preview` | 预览 `dist/`，默认路径带 `/personal_web/` |
| `npm run test:e2e` | Playwright 检查生产预览与本地作者工作台 |

浏览器测试在 Windows 使用已安装的 Edge；其他系统先运行 `pnpm exec playwright install --with-deps chromium`。先构建再运行浏览器测试；测试使用 4321、4322 端口，保存测试结束时会恢复原布局文件。

## 内容与自定义

| 要修改的内容 | 编辑位置 |
| --- | --- |
| 文章、标签、分类、图片与公式 | `src/content/posts/` 中的 `.md` / `.mdx` |
| 项目介绍、关联仓库与项目状态 | `src/content/projects/` |
| 关于我正文、友链说明 | `src/content/spec/about.md`、`friends.md` |
| 首页模块、侧栏、壁纸、轮换与视觉参数 | 作者工作台，或 `src/config/layout.json` |
| 头像、昵称、简介与联系方式 | `src/config/profileConfig.ts` |
| 站点标题、元信息、页面开关与导航 | `src/config/siteConfig.ts`、`navBarConfig.ts` |
| 公告与页脚 | `src/config/announcementConfig.ts`、`FooterConfig.html` |
| 相册说明、封面与图片 | `src/config/galleryConfig.ts`、`public/gallery/<相册ID>/` |
| 友链卡片 | `src/config/friendsConfig.ts` |
| 本地曲目、Meting 歌单与播放器 | `src/config/musicConfig.ts` |
| GitHub 精选仓库、Bilibili UID 与观看记录覆盖 | `config/external-sources.json` |
| 壁纸、头像等公开静态素材 | `public/assets/` |

布局优先在工作台或 `layout.json` 修改：它会覆盖其他配置文件中的对应默认值。轮换列表非空时优先于备用单图，每种设备至少配置两张图才会轮换。详细参数、路径写法、配置优先级和生效条件见下列文档。

- [博客操作手册](docs/content-guide.md)：从启动、每个工作台控件，到写文章、添加项目／相册、追番、音乐和发布排错的完整步骤。
- [完整配置参数字典](docs/configuration-reference.md)：各字段的用途、类型、可选值、单位、优先级与修改示例。
- [高级与可选功能](docs/advanced-configuration.md)：评论、统计、字体、代码与图表、特效、看板娘、动态、书签、其他媒体列表与打赏。
- [配置目录索引](src/config/README.md)：快速查找配置文件与覆盖关系。

## GitHub Pages 发布

线上入口：[https://unin-1.github.io/personal_web/](https://unin-1.github.io/personal_web/)。

仓库 **Settings → Pages → Source** 使用 **GitHub Actions**。[发布工作流](.github/workflows/pages.yml) 在 `codex/**` 分支和面向 `main` 的 Pull Request 上执行验证；合入 `main` 后，检查、行为测试、构建和浏览器验收通过即部署 `dist/`。

工作流支持手动触发，并每天北京时间 **06:00** 更新公开外部数据后重新发布；定时运行可能因 GitHub 排队延后。第三方同步失败会保留对应来源此前的成功快照，页面展示最后成功同步时间；未配置来源时显示空态。

修改仓库名、账号或域名时，需要同时检查站点 URL 与 Astro `base`。部署路径、缓存策略和本地工具隔离见 [架构与部署](docs/architecture.md)。

## 来源与许可

主题基于 [CuteLeaf/Firefly](https://github.com/CuteLeaf/Firefly)，固定导入提交 [`91cbbefe53716e70b77ca9c41e27af10f5b27cab`](https://github.com/CuteLeaf/Firefly/tree/91cbbefe53716e70b77ca9c41e27af10f5b27cab)，保留 [MIT 许可证](LICENSE)与上游署名。

界面预览与素材记录见 [素材来源](assets-origin.md)。网站文章、个人图片及第三方媒体的使用范围按各自来源与授权确定。
