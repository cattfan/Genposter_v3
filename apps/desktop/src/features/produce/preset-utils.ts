import type { Recipe } from "@genposter/schema";

import { slugify } from "../../lib/paths.js";
import type { ElementInfo } from "./elements.js";

/** Flat, form-friendly representation of a recipe used by the Produce UI. */
export interface Draft {
  id: string;
  name: string;
  templateId: string; // TemplateSet id
  sheet: string;
  filterField: string;
  filterValue: string;
  limit: string;
  perItem: number;
  perSet: number;
  randomSetCount: number;
  /** elementId -> binding token */
  bindings: Record<string, string>;
  outDir: string;
  format: "jpg" | "png";
  quality: number;
}

export function emptyDraft(templateId = ""): Draft {
  return {
    id: "",
    name: "Khuôn mới",
    templateId,
    sheet: "",
    filterField: "",
    filterValue: "",
    limit: "",
    perItem: 1,
    perSet: 0,
    randomSetCount: 5,
    bindings: {},
    outDir: "",
    format: "jpg",
    quality: 90,
  };
}

/** Prefill bindings from element design hints (without overwriting). */
export function mergeElements(draft: Draft, elements: ElementInfo[]): Draft {
  const bindings = { ...draft.bindings };
  for (const el of elements) {
    if (bindings[el.id] === undefined && el.bindHint) bindings[el.id] = el.bindHint;
  }
  const valid = new Set(elements.map((e) => e.id));
  for (const id of Object.keys(bindings)) if (!valid.has(id)) delete bindings[id];
  return { ...draft, bindings };
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
    data: {
      sheet: d.sheet,
      filter,
      limit: d.limit ? Number(d.limit) : null,
    },
    photos: { perItem: d.perItem, perSet: d.perSet },
    randomSetCount: d.randomSetCount,
    bindings,
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
    sheet: r.data.sheet,
    filterField: filterKeys[0] ?? "",
    filterValue: filterKeys[0] ? r.data.filter[filterKeys[0]]! : "",
    limit: r.data.limit != null ? String(r.data.limit) : "",
    perItem: r.photos.perItem,
    perSet: r.photos.perSet,
    randomSetCount: r.randomSetCount,
    bindings,
    outDir: r.output.dir,
    format: r.output.format,
    quality: r.output.quality,
  };
}
