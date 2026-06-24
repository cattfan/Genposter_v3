/**
 * Genposter shared contracts.
 *
 * Two artifacts, kept strictly separate:
 *  - Template (templates/<id>.json): pure Fabric design scene + stable object ids.
 *  - Recipe  (recipes/<id>.yaml):   data binding preset that references a template.
 *
 * A template never stores sheet/filter/binding. A recipe never stores layout.
 */

// ---------------------------------------------------------------------------
// Template (design, produced by Tab 1)
// ---------------------------------------------------------------------------

export interface GenposterTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  /** Fabric `canvas.toJSON()` output (one scene = one page design). */
  scene: FabricScene;
  /** Optional preview data URL captured on save. */
  thumbnail?: string;
  updatedAt?: string;
}

export interface TemplatePage {
  id: string;
  name?: string;
  scene: FabricScene;
  /** Small JPEG data URL preview, regenerated on save. */
  thumbnail?: string;
}

export interface TemplateSet {
  id: string;
  name: string;
  width: number;
  height: number;
  pages: TemplatePage[];
  createdAt?: string;
  updatedAt?: string;
}

/** Loose shape of a Fabric serialized scene; objects carry custom keys below. */
export interface FabricScene {
  version?: string;
  background?: string;
  objects: FabricObjectJSON[];
  [key: string]: unknown;
}

export interface FabricObjectJSON {
  type?: string;
  /** Stable id we attach to every object for binding. */
  id?: string;
  /** Design-time slot hint (e.g. "item.name"); not sheet-specific. */
  gpBind?: string;
  gpLabel?: string;
  /** Marks this object as part of the repeating list row. @deprecated use gpDataGroup */
  gpListRow?: boolean;
  /** Data group id — objects in the same group share one item when producing. */
  gpDataGroup?: string;
  text?: string;
  [key: string]: unknown;
}

/** Logical data group on a template page (stored on FabricScene.dataGroups). */
export interface DataGroupDef {
  id: string;
  label: string;
  memberIds: string[];
  layoutGroupId?: string;
  mode: "slot" | "repeat";
  itemIndex?: number;
  repeat?: {
    rowHeight: number;
    gap: number;
    maxRows: number;
  };
}

export interface FabricSceneWithGroups extends FabricScene {
  dataGroups?: DataGroupDef[];
}

// ---------------------------------------------------------------------------
// Mapping (data/mapping.yaml)
// ---------------------------------------------------------------------------

export interface MappingPhotoGroup {
  label: string;
  path: string;
}

export interface MappingSheet {
  label: string;
  photos: string | null;
  fields: Record<string, string>;
}

export interface Mapping {
  database: string;
  photos: Record<string, MappingPhotoGroup>;
  templates_ref?: Record<string, { label: string }>;
  sheets: Record<string, MappingSheet>;
  image_extensions: string[];
}

// ---------------------------------------------------------------------------
// Slide data (built from Excel + mapping at produce time)
// ---------------------------------------------------------------------------

export interface SlideItem {
  name?: string;
  address?: string;
  price?: string;
  price_pp?: string;
  desc?: string;
  photo_key?: string;
  /** Absolute paths to resolved photos for this item. */
  photos: string[];
  [extra: string]: unknown;
}

export interface Slide {
  index: number;
  page: number;
  pages: number;
  title: string;
  subtitle: string;
  items: SlideItem[];
  /** Slide-level illustrative photos. */
  photos: string[];
}

export interface SlidePayload {
  recipeId: string;
  templateId: string;
  sheet: string;
  count: number;
  slides: Slide[];
}

// ---------------------------------------------------------------------------
// Recipe (binding preset, produced by Tab 2)
// ---------------------------------------------------------------------------

/**
 * Binding token grammar (string `bind`):
 *  - ""                 not bound
 *  - "static:<text>"    literal text
 *  - "title" | "subtitle" | "page" | "pages" | "n"
 *  - "item.<field>"     canonical item field (name, address, price, ...)
 *  - "photo:item:<i>"   i-th photo of the current item
 *  - "photo:slide:<i>"  i-th slide-level photo
 *  - "ai:<prompt>"      (future) AI-generated text from item fields
 */
export interface ElementBinding {
  elementId: string;
  bind: string;
  label?: string;
}

export interface ListRowConfig {
  /** Object ids that make up one repeating row. */
  elementIds: string[];
  rowHeight: number;
  gap: number;
  maxRows: number;
}

export interface RecipeOutput {
  dir: string;
  format: "jpg" | "png";
  quality: number;
}

export interface Recipe {
  id: string;
  name: string;
  templateId: string;
  title: string;
  subtitle: string;
  data: {
    sheet: string;
    filter: Record<string, string>;
    itemsPerSlide: number;
    limit: number | null;
  };
  photos: {
    perItem: number;
    perSlide: number;
  };
  bindings: ElementBinding[];
  listRow: ListRowConfig | null;
  output: RecipeOutput;
}

// ---------------------------------------------------------------------------
// Jobs (export progress, in-memory)
// ---------------------------------------------------------------------------

export type JobStatus = "idle" | "building" | "built" | "rendering" | "done" | "error";

export interface ExportJob {
  status: JobStatus;
  total: number;
  done: number;
  outputDir: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

/** Canonical field -> Vietnamese label for the binding UI. */
export const FIELD_LABELS: Record<string, string> = {
  name: "Tên",
  address: "Địa chỉ",
  price: "Giá",
  price_pp: "Giá/đầu người",
  desc: "Mô tả",
  hours: "Giờ mở cửa",
  style: "Phong cách",
  model: "Mô hình",
  direction: "Hướng đi",
  partner: "Đối tác",
  highlight: "Nổi bật",
  time: "Thời điểm",
  phone: "SĐT",
  service_type: "Loại dịch vụ",
  category: "Danh mục",
  title: "Tiêu đề",
};

export const SLIDE_BIND_OPTIONS: { bind: string; label: string }[] = [
  { bind: "title", label: "Tiêu đề slide" },
  { bind: "subtitle", label: "Phụ đề" },
  { bind: "page", label: "Trang (số)" },
  { bind: "pages", label: "Tổng số trang" },
];

export const CANVAS_W = 1080;
export const CANVAS_H = 1350;
export const BRAND_ORANGE = "#ff6600";

export const DEFAULT_TEMPLATE_W = 1588;
export const DEFAULT_TEMPLATE_H = 2248;
