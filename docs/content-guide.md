# 内容维护指南

## 文章与数学公式

在 `src/content/posts/` 新建文件，例如 `my-first-note.md`：

```markdown
---
title: 我的第一篇文章
published: 2026-10-15
description: 文章摘要
tags: [日常, 技术]
category: 生活
image: /assets/backgrounds/summer-sky.webp
draft: false
---

## 一个想法

行内公式：$E=mc^2$。

$$
\sum_{k=1}^{n} k = \frac{n(n+1)}{2}
$$
```

`published` 用不加引号的 `YYYY-MM-DD`，草稿设 `draft: true`。行内和块级公式由 KaTeX 渲染，支持其数学 LaTeX 语法。完整 TeX 论文文档、任意宏包不属于文章渲染范围。

推荐把文章与图片放在同一目录，用 `./photo.webp` 引用；公共图片放入 `public/assets/` 后用 `/assets/...` 引用。构建会统一添加部署前缀。图片应提供具体替代文字。发布后通过“标签”页或文章标签进入筛选列表。

## 首页、壁纸与侧栏

运行 `npm run edit`，打开终端中的本地工作台。首页模块支持拖拽与 ↑↓ 排序、显隐；侧栏组件还可以在左右栏之间移动。文章目录仅在内容详情页出现。

工作台提供 1280px 桌面、390px 手机预览，可修改主题色、页面宽度、壁纸模式、图片地址、标题、遮罩、透明度、模糊度和默认文章列表样式。壁纸模式等结构变化保存后刷新预览；其余设置可即时查看。使用已有本地图片时先放入 `public/assets/`，再填写 `/assets/...`；也支持 HTTPS 图片地址。

“全站侧栏”中的卡片背景可分别设置浅色与深色模式，使用取色器或填写 `#RRGGBB`。侧栏始终使用不透明实色，适用于左栏、右栏及手机页底，不受“正文卡片不透明度”影响。颜色会即时预览，保存后写入 `visual.sidebarCardColorLight` 与 `visual.sidebarCardColorDark`，旧布局缺少这两个字段时自动采用白色与深墨绿色。

![侧栏配色工作台](previews/sidebar-colors.webp)

“保存”写入 `src/config/layout.json`。“恢复默认”先改变工作台草稿，保存后才更新文件。VS Code 等外部程序修改了文件时，工作台会拒绝覆盖并提示重新加载。手工维护与工作台共享同一 JSON；访客偏好另存各自浏览器，不修改站点默认值。

## GitHub 项目

1. 在 `config/external-sources.json` 的 `github.repositories` 加入公开仓库，例如 `"Unin-1/personal_web"`。
2. 在 `src/content/projects/` 新建 Markdown 文件：

```markdown
---
title: 我的项目
published: 2026-10-15
repo: Unin-1/personal_web
status: in-progress
tags: [Astro, 开源]
---

这里写项目介绍。
```

状态可设 `in-progress`（进行中）、`completed`（已完成）、`interrupted`（中断），省略则隐藏。构建读取 GitHub 的公开简介、主要语言、星标。非空的手写 `description`、`language` 以及明确填写的 `stars` 优先；状态始终手动维护。仓库的 archived 标记不代表项目中断。

## 相册与友链

在 `galleryConfig.ts` 的 `albums` 添加相册 ID、名称、说明和日期；把照片放到 `public/gallery/<ID>/`。`cover.webp` 等 `cover.*` 优先用作封面；也可在配置中填写 `cover`。目录内 `urls.txt` 每行可放一张远程图片的完整地址，`#` 开头为注释。

相册配置可添加 `photoDescriptions: { "cover.webp": "照片说明" }`，也可用完整远程 URL 作键；说明会作为替代文字、图片下方文字和放大查看的标题。图片支持键盘 Enter 打开、Escape 关闭。

友链卡片在 `friendsConfig.ts` 的数组中维护 `title`、`imgurl`、`desc`、`siteurl`、`tags`、`weight` 和 `enabled`。关于与联系页面在 `src/content/spec/about.md` 修改。默认仅公开 GitHub 链接。

## Bilibili 追番

在 `config/external-sources.json` 填写公开账号 UID：

```json
{
  "github": { "repositories": ["Unin-1/personal_web"] },
  "bilibili": {
    "uid": "你的数字UID",
    "overrides": {
      "番剧条目ID": { "watchedEpisodes": 3, "status": "watching" }
    }
  }
}
```

请用真实数字替换示例值。条目 ID 可从同步快照的 `bilibili.items[].id` 查到。个人状态支持 `planned`、`watching`、`completed`、`on-hold`、`dropped`。

同步仅读取公开列表，不需要账号 Cookie。番剧更新集数来自 B站，个人已看集数和状态来自明确的本地补充；两者分别展示。账号隐私、接口限制或网络错误可能导致同步失败，此时保留最后成功数据和原同步时间。更换 UID 不会展示旧账号的数据。

手动运行 `npm run sync`，或在下一次构建时同步。CI 通过 Actions cache 保留成功快照。

## 本地音乐与 Meting

在 `src/config/musicConfig.ts` 选择 `mode: "local"`，加入音乐：

```ts
local: {
  playlist: [{
    name: "曲名",
    artist: "作者",
    url: "/assets/music/my-song.mp3",
    cover: "/assets/backgrounds/summer-sky.webp",
    lrc: "/assets/music/my-song.lrc",
  }],
},
```

文件放入 `public/assets/music/`；`lrc` 也可以直接填写带时间戳的歌词字符串。

使用 Meting 时设置 `mode: "meting"`，填写 `meting.api`、`server`、`type`、`id`，可配置 `fallbackApis`。API 地址支持 `:server`、`:type`、`:id`、`:auth`、`:r` 占位符，例如 `https://你的服务/api?server=:server&type=:type&id=:id`。服务应支持 HTTPS 和浏览器跨源请求。

音乐配置会发送到浏览器，`auth` 只能填写可公开的客户端参数，不能放服务端密钥。播放器由用户手动开始播放，站内导航保持播放；刷新页面不承诺连续播放。默认歌单为空，避免分发未经授权的音乐。
