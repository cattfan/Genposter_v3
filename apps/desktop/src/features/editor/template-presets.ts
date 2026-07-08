import { DEFAULT_TEMPLATE_H, DEFAULT_TEMPLATE_W } from "@genposter/schema";

export interface TemplateSizePreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

/** Common canvas sizes for carousel / social templates. */
export const TEMPLATE_SIZE_PRESETS: TemplateSizePreset[] = [
  {
    id: "tiktok-4-5",
    label: "Carousel 4:5",
    width: 1080,
    height: 1350,
  },
  {
    id: "story-9-16",
    label: "Story 9:16",
    width: 1080,
    height: 1920,
  },
  {
    id: "square-1-1",
    label: "Vuông 1:1",
    width: 1080,
    height: 1080,
  },
  {
    id: "default",
    label: "Mặc định",
    width: DEFAULT_TEMPLATE_W,
    height: DEFAULT_TEMPLATE_H,
  },
];
