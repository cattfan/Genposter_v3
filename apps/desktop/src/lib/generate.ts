import type { DataRow, GeneratePayload, Recipe, TemplateSet } from "@genposter/schema";

import { applyAiBindings } from "./ai.js";
import { canonicalRows, type CanonRow } from "./excel.js";
import { buildKhuonPlan, generateSets } from "./khuon-plan.js";
import { resolvePhotos } from "./photos.js";
import { normCompare } from "./text.js";

function applyFilter(rows: CanonRow[], filter: Record<string, string>): CanonRow[] {
  const keys = Object.keys(filter ?? {});
  if (!keys.length) return rows;
  return rows.filter((r) => keys.every((k) => normCompare(r._raw[k], filter[k])));
}

/** Count candidate rows after filter + limit (no photo resolution). */
export async function countCandidates(
  sheet: string,
  filter: Record<string, string>,
  limit: number | null,
): Promise<number> {
  if (!sheet) return 0;
  const { rows } = await canonicalRows(sheet);
  let filtered = applyFilter(rows, filter);
  if (limit) filtered = filtered.slice(0, limit);
  return filtered.length;
}

/** Load + filter + resolve photos into flat DataRow candidates. */
export async function loadCandidates(recipe: Recipe): Promise<DataRow[]> {
  const { map, rows } = await canonicalRows(recipe.data.sheet);

  let filtered = applyFilter(rows, recipe.data.filter);
  if (recipe.data.limit) filtered = filtered.slice(0, recipe.data.limit);

  const out: DataRow[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const r = filtered[i]!;
    const photos = await resolvePhotos({
      groupSlug: map.photos,
      photoKey: String(r.photo_key ?? ""),
      name: String(r.name ?? ""),
      ordinal: i,
      count: recipe.photos.perItem,
    });
    const { _raw, ...fields } = r;
    void _raw;
    out.push({ ...(fields as Record<string, unknown>), photos });
  }
  return out;
}

/** Build the full random-filled payload for a khuôn. Throws if data is short. */
export async function buildGenerate(
  set: TemplateSet,
  recipe: Recipe,
): Promise<GeneratePayload> {
  if (!recipe.data.sheet) throw new Error("Khuôn chưa chọn sheet.");

  const plan = buildKhuonPlan(set);
  const candidates = await loadCandidates(recipe);

  if (candidates.length < plan.rowsNeededPerSet) {
    throw new Error(
      `Không đủ dữ liệu: mỗi bộ cần ${plan.rowsNeededPerSet} dòng, chỉ có ${candidates.length} sau lọc.`,
    );
  }

  const count = Math.max(1, recipe.randomSetCount || 1);
  const sets = generateSets(plan, candidates, count, recipe.photos.perSet);
  await applyAiBindings(recipe, sets, plan);

  return {
    recipeId: recipe.id,
    templateId: recipe.templateId,
    sheet: recipe.data.sheet,
    rowsNeededPerSet: plan.rowsNeededPerSet,
    sets,
  };
}
