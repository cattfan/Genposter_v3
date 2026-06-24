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
