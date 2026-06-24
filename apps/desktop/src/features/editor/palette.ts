export const PALETTE = [
  "#ff6600",
  "#e65c00",
  "#1f1d1b",
  "#ffffff",
  "#f5f6f8",
  "#6b6660",
  "#ffd2b3",
  "#fff3eb",
  "#d4351c",
  "#1f9d55",
  "#1c6ed4",
  "#9b51e0",
  "#f2c94c",
  "#000000",
  "#8a8178",
  "#fde68a",
];

/** Màu thương hiệu — swatch nhanh tab Nền */
export const BRAND_COLORS: { label: string; value: string }[] = [
  { label: "Cam Riviu", value: "#ff6600" },
  { label: "Cam đậm", value: "#e65c00" },
  { label: "Kem", value: "#fff3eb" },
  { label: "Đen", value: "#1f1d1b" },
  { label: "Trắng", value: "#ffffff" },
];

export interface TextStylePreset {
  label: string;
  text: string;
  fontSize: number;
  fontWeight?: string;
  fill?: string;
  width?: number;
}

export const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  {
    label: "Caption",
    text: "Mô tả ngắn",
    fontSize: 28,
    fontWeight: "400",
    fill: "#6b6660",
    width: 520,
  },
  {
    label: "Giá",
    text: "99.000đ",
    fontSize: 56,
    fontWeight: "700",
    fill: "#ff6600",
    width: 400,
  },
  {
    label: "Nhãn",
    text: "HOT",
    fontSize: 32,
    fontWeight: "800",
    fill: "#ffffff",
    width: 160,
  },
];

export interface SlotDef {
  bind: string;
  label: string;
  kind: "text" | "photo";
}

export const DESIGN_SLOTS: SlotDef[] = [
  { bind: "title", label: "Tiêu đề", kind: "text" },
  { bind: "subtitle", label: "Phụ đề", kind: "text" },
  { bind: "page", label: "Trang", kind: "text" },
  { bind: "pages", label: "Tổng trang", kind: "text" },
  { bind: "n", label: "STT", kind: "text" },
  { bind: "item.name", label: "Tên", kind: "text" },
  { bind: "item.address", label: "Địa chỉ", kind: "text" },
  { bind: "item.price", label: "Giá", kind: "text" },
  { bind: "item.price_pp", label: "Giá/người", kind: "text" },
  { bind: "item.desc", label: "Mô tả", kind: "text" },
  { bind: "photo:item:0", label: "Ảnh item", kind: "photo" },
  { bind: "photo:slide:0", label: "Ảnh slide", kind: "photo" },
];
