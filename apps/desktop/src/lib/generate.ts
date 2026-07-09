import type { DataRow, MappingSheet, Recipe, TemplateSet, GeneratePayload } from "@genposter/schema";

import { applyAiBindings } from "./ai.js";
import type { CanonRow } from "./excel.js";
import { buildKhuonPlan, generateSets } from "./khuon-plan.js";
import { loadMapping } from "./mapping.js";
import { join, paths } from "./paths.js";
import { resolvePhotos } from "./photos.js";
import { settings } from "./settings.js";
import { loadCacheIndex } from "./sync.js";
import { normCompare } from "./text.js";

/** CanonRow plus pre-resolved photos when the row comes from the server cache. */
type SourceRow = CanonRow & { _photos?: string[] };

/**
 * Thrown when the local server cache has never been populated. Kept distinct
 * from "0 rows after filter" so the UI (candidate count, generate gate,
 * bound preview) can tell "not synced yet" apart from a real empty result
 * instead of collapsing both into a confusing "0 dòng".
 */
export class DataNotSyncedError extends Error {
  constructor() {
    super("Chưa đồng bộ dữ liệu từ server. Vào tab Dữ liệu bấm Cập nhật ngay.");
    this.name = "DataNotSyncedError";
  }
}

function applyFilter<T extends CanonRow>(rows: T[], filter: Record<string, string>): T[] {
  const keys = Object.keys(filter ?? {});
  if (!keys.length) return rows;
  return rows.filter((r) => keys.every((k) => normCompare(r._raw[k], filter[k])));
}

function clean(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Read rows from the synced server cache on disk. */
async function sourceRows(
  sheet: string,
): Promise<{ map: MappingSheet; rows: SourceRow[] }> {
  const province = settings().server.province || "dalat";
  const idx = await loadCacheIndex(province);
  if (!idx) throw new DataNotSyncedError();
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

async function sourceRowsToDataRows(
  map: MappingSheet,
  filtered: SourceRow[],
  perItem: number,
): Promise<DataRow[]> {
  const out: DataRow[] = [];
  for (let i = 0; i < filtered.length; i++) {
    const r = filtered[i]!;
    // An empty array (no attachments synced from the server, or all of a
    // record's downloads failed) is still truthy — checking length too so
    // those rows fall back to matching a local data/photos/ folder instead
    // of silently rendering blank image slots.
    const photos =
      r._photos && r._photos.length > 0
        ? r._photos.slice(0, perItem)
        : await resolvePhotos({
            groupSlug: map.photos,
            photoKey: String(r.photo_key ?? ""),
            name: String(r.name ?? ""),
            ordinal: i,
            count: perItem,
          });
    const { _raw, _photos, ...fields } = r;
    void _raw;
    void _photos;
    out.push({ ...(fields as Record<string, unknown>), photos });
  }
  return out;
}

/**
 * Load preview rows with resolved photos, from the same server cache
 * `loadCandidates`/`buildGenerate` use — so the Produce bound preview always
 * agrees with what an actual generate run would produce. Never throws: an
 * unsynced cache or an empty filtered result both just return `[]`, and
 * callers already render a neutral "no preview" state for that (the
 * candidate-count gate in ProduceTab is where "not synced" gets a specific,
 * actionable message instead — see countCandidates/DataNotSyncedError).
 */
export async function loadPreviewRows(
  sheet: string,
  opts?: {
    filter?: Record<string, string>;
    limit?: number | null;
    perItem?: number;
  },
): Promise<DataRow[]> {
  if (!sheet) return [];
  const perItem = opts?.perItem ?? 1;
  const filter = opts?.filter ?? {};
  const limit = opts?.limit ?? null;

  try {
    const { map, rows } = await sourceRows(sheet);
    let filtered = applyFilter(rows, filter);
    if (limit) filtered = filtered.slice(0, limit);
    return await sourceRowsToDataRows(map, filtered, perItem);
  } catch {
    return [];
  }
}

/** Load + filter + resolve photos into flat DataRow candidates. */
export async function loadCandidates(recipe: Recipe): Promise<DataRow[]> {
  const { map, rows } = await sourceRows(recipe.data.sheet);

  let filtered = applyFilter(rows, recipe.data.filter);
  if (recipe.data.limit) filtered = filtered.slice(0, recipe.data.limit);

  return sourceRowsToDataRows(map, filtered, recipe.photos.perItem);
}

/** Build the full random-filled payload for a khuôn. Throws if data is short. */
export async function buildGenerate(
  set: TemplateSet,
  recipe: Recipe,
  opts?: { onAiProgress?: (done: number, total: number) => void },
): Promise<GeneratePayload> {
  if (!recipe.data.sheet) throw new Error("Khuôn chưa chọn sheet.");

  const bindings = Object.fromEntries(recipe.bindings.map((b) => [b.elementId, b.bind]));
  const plan = buildKhuonPlan(set, bindings);
  const candidates = await loadCandidates(recipe);

  if (candidates.length < plan.rowsNeededPerSet) {
    throw new Error(
      `Không đủ dữ liệu: mỗi bộ cần ${plan.rowsNeededPerSet} dòng, chỉ có ${candidates.length} sau lọc.`,
    );
  }

  const count = Math.max(1, recipe.randomSetCount || 1);
  const sets = generateSets(plan, candidates, count, recipe.photos.perSet);
  await applyAiBindings(recipe, sets, plan, opts?.onAiProgress);

  return {
    recipeId: recipe.id,
    templateId: recipe.templateId,
    sheet: recipe.data.sheet,
    rowsNeededPerSet: plan.rowsNeededPerSet,
    sets,
  };
}
