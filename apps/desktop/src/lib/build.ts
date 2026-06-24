import type { Recipe, Slide, SlideItem, SlidePayload } from "@genposter/schema";

import { applyAiBindings } from "./ai.js";
import { canonicalRows } from "./excel.js";
import { resolvePhotos } from "./photos.js";
import { normCompare } from "./text.js";

function applyFilter(
  rows: { _raw: Record<string, unknown>; [k: string]: unknown }[],
  filter: Record<string, string>,
) {
  const keys = Object.keys(filter ?? {});
  if (!keys.length) return rows;
  return rows.filter((r) => keys.every((k) => normCompare(r._raw[k], filter[k])));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  const s = Math.max(1, size);
  for (let i = 0; i < arr.length; i += s) out.push(arr.slice(i, i + s));
  return out;
}

export async function buildSlides(recipe: Recipe): Promise<SlidePayload> {
  if (!recipe.data.sheet) throw new Error("Preset chưa chọn sheet.");
  const { map, rows } = await canonicalRows(recipe.data.sheet);

  let filtered = applyFilter(rows, recipe.data.filter);
  if (recipe.data.limit) filtered = filtered.slice(0, recipe.data.limit);

  const groupSlug = map.photos;
  const perItem = recipe.photos.perItem;
  const perSlide = recipe.photos.perSlide;

  const items: SlideItem[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const r = filtered[i]!;
    const photos = await resolvePhotos({
      groupSlug,
      photoKey: String(r.photo_key ?? ""),
      name: String(r.name ?? ""),
      ordinal: i,
      count: perItem,
    });
    const { _raw, ...fields } = r;
    void _raw;
    items.push({ ...(fields as Record<string, unknown>), photos } as SlideItem);
  }

  const pages = chunk(items, recipe.data.itemsPerSlide || 7);
  const slides: Slide[] = pages.map((page, idx) => {
    const slidePhotos: string[] = [];
    if (perSlide > 0) {
      outer: for (const it of page) {
        for (const p of it.photos) {
          if (!slidePhotos.includes(p)) slidePhotos.push(p);
          if (slidePhotos.length >= perSlide) break outer;
        }
      }
    }
    return {
      index: idx + 1,
      page: idx + 1,
      pages: pages.length,
      title: recipe.title,
      subtitle: recipe.subtitle,
      items: page,
      photos: slidePhotos,
    };
  });

  await applyAiBindings(recipe, slides);

  return {
    recipeId: recipe.id,
    templateId: recipe.templateId,
    sheet: recipe.data.sheet,
    count: items.length,
    slides,
  };
}
