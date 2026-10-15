# 默认壁纸素材来源

- 素材：原创二次元夏日海岸背景，生成日期 2026-10-15。
- 来源：OpenAI 内置 `image_gen` 图像生成工具；单张原创生成，无外部参考图。
- 用途：个人博客首页横幅、全屏壁纸。
- 原始文件（仅本地保留，不随网站发布；Git 中保留优化版本与完整提示词）：`.cache/imagegen/summer-sky-original.png`。
- 派生文件已使用 sharp 生成，仅压缩、缩放和居中裁切，不添加内容；桌面质量 85，手机质量 84，WebP effort 6。
- 已人工检查：清爽日系背景、蓝天白云、远处海岸小镇、绿植；中央留白；无人像、文字、标志或水印。
- 已通过 `view_image` 检查桌面与手机最终 WebP；手机版保留中央天空、海岸和小镇，适合纵向全屏背景。
- 建议替代文本：夏日蓝天下的海岸小镇，白云、碧海和绿树映着明亮阳光。

| 文件 | 尺寸 | 体积 |
| --- | --- | --- |
| `.cache/imagegen/summer-sky-original.png` | 1672 × 941 | 2,305,185 bytes（2.20 MiB） |
| `public/assets/backgrounds/summer-sky.webp` | 1672 × 941 | 204,740 bytes（199.94 KiB） |
| `public/assets/backgrounds/summer-sky-mobile.webp` | 768 × 1365 | 60,720 bytes（59.30 KiB） |
| `public/gallery/summer-sky/cover.webp` | 1672 × 941 | 204,740 bytes（199.94 KiB）；桌面 WebP 的相册副本 |

## 最终生成提示词

```text
Use case: stylized-concept
Asset type: original hero background and fullscreen wallpaper for a Chinese anime personal blog.
Primary request: A fresh, serene Japanese anime background painting of a bright summer sky with soft white cumulus clouds above a distant seaside town and coast, with a few delicate green leaves framing the outer edges.
Style/medium: high-quality original hand-painted anime environment illustration, crisp airy brushwork, subtle soft atmospheric perspective, refined and calm.
Composition/framing: widescreen 16:9 landscape. The upper two thirds are open pale blue sky with a few generously spaced clouds; keep the central area quiet and uncluttered for overlaid page titles. The faraway coast, small town rooftops, and a glimmering sea form a low horizon in the bottom third. Keep environmental details small, and preserve a center crop that also works on mobile.
Lighting/mood: luminous gentle summer daylight, peaceful, welcoming, optimistic.
Color palette: soft sky blue, mint green accents, white clouds, light teal sea, natural warm neutral rooftops.
Constraints: original environment only, no people or character closeups, no text, no lettering, no logos, no signature, no watermark, no UI, no borders. Opaque background.
```

## 界面预览图

`docs/previews/home-desktop.webp` 与 `layout-editor.webp` 来自本项目 Playwright 验收截图，经 sharp 以 WebP 质量 80 压缩；仅展示项目自有界面和上述原创壁纸，分别为 98,144 与 96,284 bytes。
