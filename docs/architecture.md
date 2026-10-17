# 架构与部署

## 模块划分

- Astro 负责静态路由、Markdown/MDX 内容集合、SEO、RSS 与页面渲染。
- Svelte 和现有浏览器脚本负责搜索、主题、筛选、图片浏览和播放器。Swup 保持站内导航和播放器单例。
- `src/config/` 保存站点设置；`layout.json` 是可视化与手工维护共用的布局源。构建工具读取独立的站点默认设置，页面通过 `siteRuntimeConfig.ts` 合并布局，避免保存布局重启开发服务器。
- `src/editor/` 和 `scripts/editor/` 实现仅本地开发启用的工作台。普通 dev、preview、生产构建均不注册写入 API；本地模式单独使用 `/`，不影响生产 `/personal_web/`。
- `scripts/sync-external-data.mjs` 读取公开 GitHub/B站数据，归一化为 `src/data/external-snapshot.json`，前台直接读取构建结果。

同步有超时、有限重试、分页完整性检查和账号隔离；失败保留对应来源的成功快照。数据只包含公开元数据，不保存 GitHub token 或 B站凭证。

本地编辑器固定绑定 `127.0.0.1:4321`，校验 Host、Origin、会话令牌和内容结构，只能写固定布局文件；版本哈希防止覆盖外部修改，原子保存避免半写入。

## GitHub Pages

1. 在仓库 Settings → Pages 中选择 GitHub Actions。
2. 完成开发分支验证后，将变更合入 `main`。
3. `.github/workflows/pages.yml` 安装冻结依赖，执行诊断、lint、行为测试、构建和浏览器测试；通过后部署 `dist/`。

发布目标为 `https://unin-1.github.io/personal_web/`。默认 `site_url` 为账号站点 origin，Astro `base` 为 `/personal_web/`；导航、Markdown 资源、图片、音乐和搜索均需保留前缀。内置产物检查会验证本地资源及作者编辑器隔离。

工作流也在每日北京时间 06:00（UTC 22:00）及手动触发时构建更新数据。定时任务在默认分支运行，时间可能受 GitHub 排队影响。外部快照缓存按分支与来源配置隔离；页面展示真实的最后成功同步时间。

使用自定义域名时，同时更新站点 URL 与 base。可通过环境变量 `SITE_BASE=/` 构建根路径版本，并让浏览器测试对应修改预览地址。

## 验证

`npm test` 使用 Node 内置测试运行器，覆盖本地写入权限、配置冲突、保存恢复、跨栏预览、缓存隔离和同步失败，以及音乐单例和手动播放。

`npm run check` 执行 Astro/TypeScript 诊断。`npm run lint` 检查本项目新增功能代码，保留导入主题的现有组织。`npm run test:e2e` 使用 Playwright 检查生产与作者工作台，包括桌面、手机、标签、公式、灯箱、项目、空态和管理入口隔离。测试原始截图和诊断存于 `.cache/`、`test-results/`，不提交；`docs/previews/` 保留经检查、压缩的界面示意图，供 README 和 PR 展示。

## 上游维护

Firefly 源码以固定提交快照导入，未替换本仓库 Git 历史。上游更新应单独比较与合并，再重跑检查；保留 `LICENSE` 中的原始声明。默认图片来源和提示词见根目录 `assets-origin.md`。
