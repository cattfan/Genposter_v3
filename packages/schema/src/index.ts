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
// Generated data (built from Excel at produce time, random-filled per set)
// ---------------------------------------------------------------------------

/** One resolved data row: canonical fields (flat) + resolved photo paths. */
export interface DataRow {
  photos: string[];
  [field: string]: unknown;
}

/** Rows assigned to one data group on one page within one set. */
export interface GroupFill {
  groupId: string;
  /** slot mode: exactly 1 row; repeat mode: one row per repeated line. */
  rows: DataRow[];
}

/** One page of a set, with its groups filled. */
export interface GeneratedPage {
  pageId: string;
  groups: GroupFill[];
}

/** One set = one independent random draw covering every page of the khuôn. */
export interface GeneratedSet {
  /** 1-based. */
  setIndex: number;
  pages: GeneratedPage[];
  /** Set-level illustrative photos (token photo:set:i). */
  setPhotos: string[];
}

export interface GeneratePayload {
  recipeId: string;
  templateId: string;
  sheet: string;
  rowsNeededPerSet: number;
  sets: GeneratedSet[];
}

// ---------------------------------------------------------------------------
// Recipe (binding preset, produced by Tab 2)
// ---------------------------------------------------------------------------

/**
 * Binding token grammar (string `bind`):
 *  - ""                 not bound
 *  - "static:<text>"    literal text
 *  - "n"                1-based ordinal within a repeat group
 *  - "item.<field>"     canonical field of the assigned data row
 *  - "photo:item:<i>"   i-th photo of the assigned data row
 *  - "photo:set:<i>"    i-th set-level photo
 *  - "ai:<prompt>"      (future) AI-generated text from item fields
 */
export interface ElementBinding {
  elementId: string;
  bind: string;
  label?: string;
}

export interface RecipeOutput {
  dir: string;
  format: "jpg" | "png";
  quality: number;
}

export interface Recipe {
  id: string;
  name: string;
  /** TemplateSet id (whole multi-page khuôn). */
  templateId: string;
  data: {
    sheet: string;
    filter: Record<string, string>;
    limit: number | null;
  };
  photos: {
    /** photos resolved per data row (token photo:item:i). */
    perItem: number;
    /** photos gathered per set (token photo:set:i). */
    perSet: number;
  };
  /** How many sets to generate per run. */
  randomSetCount: number;
  bindings: ElementBinding[];
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

export const CANVAS_W = 1080;
export const CANVAS_H = 1350;
export const BRAND_ORANGE = "#ff6600";

export const DEFAULT_TEMPLATE_W = 1588;
export const DEFAULT_TEMPLATE_H = 2248;
