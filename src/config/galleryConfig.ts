import type { GalleryConfig } from "@/types/galleryConfig";

export const galleryConfig: GalleryConfig = {
  albums: [{
    id: "summer-sky", name: "夏日来信",
    description: "原创二次元壁纸示例。把喜欢的照片与风景，慢慢收藏在这里。",
    location: "想象中的海边小镇", date: "2026-10-15", tags: ["原创插画", "风景"],
    photoDescriptions: { "cover.webp": "夏日蓝天下的海岸小镇，白云、碧海和绿树映着明亮阳光。" },
  }],
  columnWidth: 260,
};
