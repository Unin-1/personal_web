---
title: 我的二次元博客
published: 2026-10-15
repo: Unin-1/personal_web
status: in-progress
order: 100
tags: [Astro, 博客, 开源]
---

这里记录这个博客从想法到上线的过程。

项目简介、主要语言和 GitHub 星标会在构建时同步。可以在本文的 frontmatter 中填写 `description`、`language`、`stars` 覆盖同步值；项目状态始终由自己填写。

状态支持 `in-progress`（进行中）、`completed`（已完成）、`interrupted`（中断）。删除 `status` 即隐藏状态徽标。

添加其他项目时，在 `config/external-sources.json` 的 `github.repositories` 中加入公开仓库，并在这个目录添加带有 `repo: owner/repository` 的 Markdown 文件。
