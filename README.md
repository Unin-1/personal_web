# Unin 的小站

基于 Astro / Firefly 的二次元个人博客：Markdown 与数学公式、标签筛选、相册、GitHub 项目、友链、Bilibili 追番、本地与 Meting 音乐，以及仅在本机运行的布局工作台。

![首页桌面预览](docs/previews/home-desktop.webp)

![本地布局工作台预览](docs/previews/layout-editor.webp)

## 开始使用

使用 Node.js 24（版本见 `.node-version`）和 pnpm 11。

```sh
pnpm install --frozen-lockfile
npm run dev
```

开发预览：<http://localhost:4321/personal_web/>。开发服务器会在终端打印实际地址。

```sh
npm run edit
```

作者工作台：<http://127.0.0.1:4321/__editor/>。请先停止占用 4321 的普通开发服务器。工作台仅绑定本机；可拖动首页模块、跨侧栏编排组件、切换显隐、修改壁纸和主题，预览桌面／手机版并保存配置。保存后提交和推送 Git 才会上线。

```sh
npm run check       # Astro 与 TypeScript 诊断
npm run lint        # 新增功能代码的只读 Biome 检查
npm test           # Node 原生行为与回归测试
npm run build      # 同步数据、静态构建、搜索索引与产物检查
npm run preview    # 预览 dist，默认带 /personal_web/ 前缀
npm run test:e2e   # 生产预览＋本地编辑器的 Playwright 验收
```

浏览器测试在 Windows 使用已安装的 Edge；其他系统先执行 `pnpm exec playwright install --with-deps chromium`。测试会启动 4321、4322 两个端口；编辑器保存测试结束时恢复原配置。

## 内容与配置

| 内容 | 编辑位置 |
| --- | --- |
| 文章、标签、公式 | `src/content/posts/` 中的 `.md` / `.mdx` |
| 项目介绍与状态 | `src/content/projects/` |
| 关于我、友链说明 | `src/content/spec/` |
| 首页、侧栏、主题、壁纸 | `src/config/layout.json`，或 `npm run edit` |
| 头像与联系方式 | `src/config/profileConfig.ts` |
| 导航与站点元信息 | `src/config/navBarConfig.ts`、`siteConfig.ts` |
| 相册信息与图片 | `src/config/galleryConfig.ts`、`public/gallery/<相册ID>/` |
| 友链卡片 | `src/config/friendsConfig.ts` |
| 音乐来源 | `src/config/musicConfig.ts` |
| GitHub 精选仓库、B站 UID 和个人观看记录 | `config/external-sources.json` |

维护文档从以下入口阅读：

- [博客操作手册](docs/content-guide.md)：从启动、工作台每个控件，到文章、项目、相册、追番、音乐与发布的具体操作和排错。
- [完整配置参数字典](docs/configuration-reference.md)：逐文件列出字段用途、类型、可选值、单位、优先级、生效方式与示例。
- [高级与可选功能](docs/advanced-configuration.md)：评论、统计、字体、代码和图表、特效、看板娘、动态、书签、其他媒体列表、打赏的接入说明。
- [架构与部署](docs/architecture.md)：本地作者工具隔离、快照、GitHub Pages 路径与发布流程。

布局和壁纸优先在作者工作台或 `src/config/layout.json` 修改；它会覆盖静态配置中的对应默认值。背景支持独立桌面／手机多图、定时轮换和过渡，四种壁纸模式的实际区别见操作手册。

## 发布

目标地址为 `https://unin-1.github.io/personal_web/`。在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。工作流会验证推送到 `codex/**` 的分支；合入 `main` 后验证并部署，也支持手动触发和每日北京时间 06:00 更新外部数据。

Bilibili UID 或音乐来源未配置时显示空态；按手册填写后重新构建即可使用。第三方数据同步失败会保留此前的成功快照，首次失败不会伪造数据。

## 来源

主题基于 [CuteLeaf/Firefly](https://github.com/CuteLeaf/Firefly)，锁定导入提交 `91cbbefe53716e70b77ca9c41e27af10f5b27cab`。保留 [MIT 许可证](LICENSE)及主题署名。

默认壁纸通过内置 ImageGen 原创生成，提示词与资源记录见 [素材来源](assets-origin.md)。示例文章和友链位置可直接替换；提交前确认个人联系方式及图片、音乐的分发权限。
