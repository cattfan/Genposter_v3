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

export interface SlotDef {
  bind: string;
  label: string;
  kind: "text" | "photo";
}

export const DESIGN_SLOTS: SlotDef[] = [
  { bind: "n", label: "STT", kind: "text" },
  { bind: "item.name", label: "Tên", kind: "text" },
  { bind: "item.address", label: "Địa chỉ", kind: "text" },
  { bind: "item.price", label: "Giá", kind: "text" },
  { bind: "item.price_pp", label: "Giá/người", kind: "text" },
  { bind: "item.desc", label: "Mô tả", kind: "text" },
  { bind: "photo:item:0", label: "Ảnh item", kind: "photo" },
  { bind: "photo:set:0", label: "Ảnh bộ", kind: "photo" },
];
