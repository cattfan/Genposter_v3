/**
 * Shared contracts for Genposter templates, slide data, and recipes.
 * Consumed by services/render (Node) and apps/desktop (React).
 */

// ---------------------------------------------------------------------------
// Slide data (produced by services/data-api)
// ---------------------------------------------------------------------------

/** One resolved record (a place / item) ready for a template. */
export interface SlideItem {
  /** Canonical fields after mapping.yaml normalization. */
  name?: string;
  address?: string;
  price?: string;
  price_pp?: string;
  desc?: string;
  /** Original Link_drive key. */
  photo_key?: string;
  /** Absolute paths to resolved photos for this item. */
  photos: string[];
  /** Any extra mapped fields (model, style, hours, highlight, ...). */
  [extra: string]: unknown;
}

export interface Slide {
  index: number;
  title?: string;
  subtitle?: string;
  items: SlideItem[];
  /** Slide-level photo pool (e.g. bottom illustrative photos). */
  photos: string[];
}

export interface SlidePayload {
  recipe: string;
  templateId: string;
  sheet: string;
  count: number;
  slides: Slide[];
}

// ---------------------------------------------------------------------------
// Template (canonical Genposter schema)
// ---------------------------------------------------------------------------

export type LayerType = "rect" | "text" | "image" | "list" | "gallery";

export type Align = "left" | "center" | "right";
export type Fit = "cover" | "contain";

export interface BaseLayer {
  id?: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height?: number;
}

export interface RectLayer extends BaseLayer {
  type: "rect";
  fill?: string;
  radius?: number;
  stroke?: string;
  strokeWidth?: number;
}

export interface TextLayer extends BaseLayer {
  type: "text";
  /** May contain {{field}} or {{item.field}} tokens. */
  text: string;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: number | string;
  fill?: string;
  align?: Align;
  lineHeight?: number;
  /** Shrink font to fit width/height when content is long. */
  autoFit?: boolean;
  uppercase?: boolean;
}

export interface ImageLayer extends BaseLayer {
  type: "image";
  height: number;
  /** Static asset path, or a binding token like {{photo}} / {{item.photo}}. */
  src?: string;
  bind?: string;
  fit?: Fit;
  radius?: number;
}

/** Repeats `cell` layers for each slide item, stacking rows by rowHeight. */
export interface ListLayer extends BaseLayer {
  type: "list";
  source?: "items";
  rowHeight: number;
  gap?: number;
  maxRows?: number;
  /** Sub-layers positioned relative to each row; use {{item.field}}. */
  cells: Array<TextLayer | ImageLayer | RectLayer>;
  /** Optional divider drawn under every row. */
  divider?: { color: string; width?: number };
}

/** Lays out slide.photos (or item photos) in a grid of image slots. */
export interface GalleryLayer extends BaseLayer {
  type: "gallery";
  height: number;
  source?: "photos";
  columns: number;
  rows?: number;
  gap?: number;
  radius?: number;
  fit?: Fit;
}

export type Layer =
  | RectLayer
  | TextLayer
  | ImageLayer
  | ListLayer
  | GalleryLayer;

export interface TemplateFont {
  family: string;
  /** Path to a .ttf/.otf/.woff2 file (absolute or relative to repo root). */
  path: string;
  weight?: number | string;
}

export interface GenposterTemplate {
  id: string;
  name?: string;
  archetype: string;
  width: number;
  height: number;
  background?: string;
  fonts?: TemplateFont[];
  layers: Layer[];
}

// ---------------------------------------------------------------------------
// Recipe (batch preset, recipes/*.yaml)
// ---------------------------------------------------------------------------

export interface Recipe {
  name: string;
  templateId: string;
  data: {
    sheet: string;
    filter?: Record<string, string>;
    itemsPerSlide?: number;
    limit?: number;
  };
  photos?: {
    perItem?: number;
    perSlide?: number;
  };
  output: {
    dir: string;
    width?: number;
    height?: number;
    format?: "jpg" | "png";
    quality?: number;
    naming?: string;
  };
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export type JobStatus = "queued" | "running" | "done" | "error";

export interface Job {
  id: string;
  recipe: string;
  templateId: string;
  status: JobStatus;
  total: number;
  done: number;
  outputDir: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
