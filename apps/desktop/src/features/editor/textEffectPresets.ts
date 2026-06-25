import { Shadow } from "fabric";

export interface TextEffectPreset {
  id: string;
  label: string;
  strokeWidth: number;
  stroke?: string;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  } | null;
}

export const TEXT_EFFECT_PRESETS: TextEffectPreset[] = [
  { id: "none", label: "Không", strokeWidth: 0, shadow: null },
  { id: "thin", label: "Viền mảnh", strokeWidth: 2, stroke: "#1f1d1b" },
  { id: "western", label: "Phương Tây", strokeWidth: 8, stroke: "#5c2e0a" },
  { id: "bold-outline", label: "Viền đậm", strokeWidth: 12, stroke: "#1f1d1b" },
  {
    id: "shadow",
    label: "Bóng nhẹ",
    strokeWidth: 0,
    shadow: { color: "rgba(0,0,0,0.35)", blur: 8, offsetX: 2, offsetY: 4 },
  },
];

export function applyTextEffectPreset(
  preset: TextEffectPreset,
  strokeWidthOverride?: number,
): Record<string, unknown> {
  const sw = strokeWidthOverride ?? preset.strokeWidth;
  const patch: Record<string, unknown> = {
    strokeWidth: sw,
    stroke: sw > 0 ? (preset.stroke ?? "#1f1d1b") : "",
  };
  if (preset.shadow) {
    patch.shadow = new Shadow({
      color: preset.shadow.color,
      blur: preset.shadow.blur,
      offsetX: preset.shadow.offsetX,
      offsetY: preset.shadow.offsetY,
    });
  } else {
    patch.shadow = null;
  }
  return patch;
}
