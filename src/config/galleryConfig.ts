import type { GalleryConfig } from "@/types/galleryConfig";

export const galleryConfig: GalleryConfig = {
  albums: [
  {
    id: "pretty-pictures", name: "好看的",
    description: "审美积累中......",
    location: "fantasy world", date: "2026-10-17", tags: ["美图"],
    photoDescriptions: {
      "1.webp": "情绪小姐",
      "2.webp": "小日向早美",
      "3.webp": "B★RS",
      "4.webp": "伞对立",
      "5.webp": "猫猫宵崎奏",
      "6.webp": "猫对立",
    },
  }],
  columnWidth: 260,
};
