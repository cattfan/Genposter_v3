import type { Recipe } from "@genposter/schema";

import { slugify } from "../../lib/paths.js";
import type { ElementInfo } from "./elements.js";

/** Flat, form-friendly representation of a recipe used by the Produce UI. */
export interface Draft {
  id: string;
  name: string;
  templateId: string;
  title: string;
  subtitle: string;
  sheet: string;
  filterField: string;
  filterValue: string;
  itemsPerSlide: number;
  limit: string;
  perItem: number;
  perSlide: number;
  /** elementId -> binding token */
  bindings: Record<string, string>;
  listRowIds: string[];
  rowHeight: number;
  gap: number;
  maxRows: number;
  outDir: string;
  format: "jpg" | "png";
  quality: number;
}

export function emptyDraft(templateId = ""): Draft {
  return {
    id: "",
    name: "Preset mới",
    templateId,
    title: "",
    subtitle: "",
    sheet: "",
    filterField: "",
    filterValue: "",
    itemsPerSlide: 7,
    limit: "",
    perItem: 1,
    perSlide: 0,
    bindings: {},
    listRowIds: [],
    rowHeight: 110,
    gap: 8,
    maxRows: 7,
    outDir: "",
    format: "jpg",
    quality: 90,
  };
}

/** Prefill bindings/list-row from element design hints (without overwriting). */
export function mergeElements(draft: Draft, elements: ElementInfo[]): Draft {
  const bindings = { ...draft.bindings };
  const listRowIds = new Set(draft.listRowIds);
  for (const el of elements) {
    if (bindings[el.id] === undefined && el.bindHint) bindings[el.id] = el.bindHint;
    if (el.listRow) listRowIds.add(el.id);
  }
  // Drop bindings for elements no longer present.
  const valid = new Set(elements.map((e) => e.id));
  for (const id of Object.keys(bindings)) if (!valid.has(id)) delete bindings[id];
  return { ...draft, bindings, listRowIds: [...listRowIds].filter((id) => valid.has(id)) };
}

export function draftToRecipe(d: Draft, elements: ElementInfo[]): Recipe {
  const labelById = new Map(elements.map((e) => [e.id, e.label]));
  const bindings = Object.entries(d.bindings)
    .filter(([, bind]) => bind)
    .map(([elementId, bind]) => ({
      elementId,
      bind,
      label: labelById.get(elementId),
    }));

  const filter =
    d.filterField && d.filterValue ? { [d.filterField]: d.filterValue } : {};

  const id = slugify(d.id || d.name);
  return {
    id,
    name: d.name,
    templateId: d.templateId,
    title: d.title,
    subtitle: d.subtitle,
    data: {
      sheet: d.sheet,
      filter,
      itemsPerSlide: d.itemsPerSlide,
      limit: d.limit ? Number(d.limit) : null,
    },
    photos: { perItem: d.perItem, perSlide: d.perSlide },
    bindings,
    listRow: d.listRowIds.length
      ? {
          elementIds: d.listRowIds,
          rowHeight: d.rowHeight,
          gap: d.gap,
          maxRows: d.maxRows || d.itemsPerSlide,
        }
      : null,
    output: {
      dir: d.outDir || `output/${id}`,
      format: d.format,
      quality: d.quality,
    },
  };
}

export function recipeToDraft(r: Recipe): Draft {
  const filterKeys = Object.keys(r.data.filter ?? {});
  const bindings: Record<string, string> = {};
  for (const b of r.bindings) bindings[b.elementId] = b.bind;
  return {
    id: r.id,
    name: r.name,
    templateId: r.templateId,
    title: r.title,
    subtitle: r.subtitle,
    sheet: r.data.sheet,
    filterField: filterKeys[0] ?? "",
    filterValue: filterKeys[0] ? r.data.filter[filterKeys[0]]! : "",
    itemsPerSlide: r.data.itemsPerSlide,
    limit: r.data.limit != null ? String(r.data.limit) : "",
    perItem: r.photos.perItem,
    perSlide: r.photos.perSlide,
    bindings,
    listRowIds: r.listRow?.elementIds ?? [],
    rowHeight: r.listRow?.rowHeight ?? 110,
    gap: r.listRow?.gap ?? 8,
    maxRows: r.listRow?.maxRows ?? r.data.itemsPerSlide,
    outDir: r.output.dir,
    format: r.output.format,
    quality: r.output.quality,
  };
}
