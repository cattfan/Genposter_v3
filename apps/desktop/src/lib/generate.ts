import type { DataRow, MappingSheet, Recipe, TemplateSet, GeneratePayload } from "@genposter/schema";

import { applyAiBindings } from "./ai.js";
import { canonicalRows, type CanonRow } from "./excel.js";
import { buildKhuonPlan, generateSets } from "./khuon-plan.js";
import { loadMapping } from "./mapping.js";
import { join, paths } from "./paths.js";
import { resolvePhotos } from "./photos.js";
import { settings } from "./settings.js";
import { loadCacheIndex } from "./sync.js";
import { normCompare } from "./text.js";

/** CanonRow plus pre-resolved photos when the row comes from the server cache. */
type SourceRow = CanonRow & { _photos?: string[] };

function applyFilter<T extends CanonRow>(rows: T[], filter: Record<string, string>): T[] {
  const keys = Object.keys(filter ?? {});
  if (!keys.length) return rows;
  return rows.filter((r) => keys.every((k) => normCompare(r._raw[k], filter[k])));
}

function clean(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Read rows from the selected data source (local Excel or synced server cache). */
async function sourceRows(
  sheet: string,
): Promise<{ map: MappingSheet; rows: SourceRow[] }> {
  const srv = settings().server;
  if (srv.source !== "server") return canonicalRows(sheet);

  const province = srv.province || "dalat";
  const idx = await loadCacheIndex(province);
  if (!idx) {
    throw new Error("Chưa đồng bộ dữ liệu từ server. Vào tab Cài đặt bấm Đồng bộ.");
  }
  const m = await loadMapping();
  const sm = m.sheets[sheet];
  if (!sm) throw new Error(`Sheet không có trong mapping.yaml: ${sheet}`);

  const rows: SourceRow[] = (idx.sheets[sheet]?.rows ?? []).map((r) => {
    const item = { _raw: r.fields } as SourceRow;
    for (const [canon, header] of Object.entries(sm.fields)) {
      item[canon] = clean(r.fields[header]);
    }
    item._photos = r.photos.map((rel) => join(paths.cacheDir(province), rel));
    return item;
  });
  return { map: sm, rows };
}

/** Count candidate rows after filter + limit (no photo resolution). */
export async function countCandidates(
  sheet: string,
  filter: Record<string, string>,
  limit: number | null,
): Promise<number> {
  if (!sheet) return 0;
  const { rows } = await sourceRows(sheet);
  let filtered = applyFilter(rows, filter);
  if (limit) filtered = filtered.slice(0, limit);
  return filtered.length;
}

/** Load + filter + resolve photos into flat DataRow candidates. */
export async function loadCandidates(recipe: Recipe): Promise<DataRow[]> {
  const { map, rows } = await sourceRows(recipe.data.sheet);

  let filtered = applyFilter(rows, recipe.data.filter);
  if (recipe.data.limit) filtered = filtered.slice(0, recipe.data.limit);

  const out: DataRow[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const r = filtered[i]!;
    const photos = r._photos
      ? r._photos.slice(0, recipe.photos.perItem)
      : await resolvePhotos({
          groupSlug: map.photos,
          photoKey: String(r.photo_key ?? ""),
          name: String(r.name ?? ""),
          ordinal: i,
          count: recipe.photos.perItem,
        });
    const { _raw, _photos, ...fields } = r;
    void _raw;
    void _photos;
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
