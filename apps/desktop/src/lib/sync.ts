/**
 * Incremental sync from the NocoDB data server into a local cache the
 * produce pipeline can read offline.
 *
 * Layout under data/cache/<province>/:
 *   index.json                    row data + photo manifest
 *   photos/<sheet>/<recordId>/N.ext
 *
 * Incremental rule: a record's photos are re-downloaded only when its
 * attachment signature (paths+sizes) changed; records that disappeared
 * (deleted / un-published) get their photo folders removed.
 */
import { ensureDir, exists, readText, remove, writeBytes, writeText } from "./fsx.js";
import { loadMapping } from "./mapping.js";
import { join, paths } from "./paths.js";
import {
  fetchAttachment,
  listAllRecords,
  listServerTables,
  type NcAttachment,
  type NcRecord,
} from "./server-api.js";
import { settings } from "./settings.js";

export interface CachedRow {
  id: number;
  updatedAt: string;
  /** Raw column values (same headers as Excel). */
  fields: Record<string, string>;
  /** Relative photo paths inside the cache dir, in display order. */
  photos: string[];
  /** Attachment signature used for incremental diff. */
  sig: string;
}

export interface CacheIndex {
  province: string;
  syncedAt: string;
  sheets: Record<string, { rows: CachedRow[] }>;
}

export interface SyncProgress {
  onProgress?: (done: number, total: number, label: string) => void;
}

export interface SyncResult {
  sheets: number;
  rows: number;
  photosDownloaded: number;
  photosKept: number;
  removedRecords: number;
}

function attList(v: unknown): NcAttachment[] {
  if (!v) return [];
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as NcAttachment[];
    } catch {
      return [];
    }
  }
  return Array.isArray(v) ? (v as NcAttachment[]) : [];
}

function attSig(atts: NcAttachment[]): string {
  return atts.map((a) => `${a.path ?? a.url ?? a.title}:${a.size ?? 0}`).join("|");
}

function extOf(att: NcAttachment): string {
  const src = att.title ?? att.path ?? "";
  const m = /\.([a-z0-9]+)$/i.exec(src);
  return m ? m[1]!.toLowerCase() : "jpg";
}

export async function loadCacheIndex(province: string): Promise<CacheIndex | null> {
  const p = join(paths.cacheDir(province), "index.json");
  if (!(await exists(p))) return null;
  try {
    return JSON.parse(await readText(p)) as CacheIndex;
  } catch {
    return null;
  }
}

/** Full sync pass; incremental on photos. Returns summary counts. */
export async function syncProvince(opts: SyncProgress = {}): Promise<SyncResult> {
  const s = settings().server;
  if (!s.url || !s.token) throw new Error("Chưa cấu hình server (URL / token).");
  const province = s.province || "dalat";
  const cacheDir = paths.cacheDir(province);
  await ensureDir(cacheDir);

  const mapping = await loadMapping();
  const sheetNames = Object.keys(mapping.sheets);
  const tables = await listServerTables(s);

  const old = await loadCacheIndex(province);
  const oldRowsBySheet = new Map<string, Map<number, CachedRow>>();
  for (const [name, sh] of Object.entries(old?.sheets ?? {})) {
    oldRowsBySheet.set(name, new Map(sh.rows.map((r) => [r.id, r])));
  }

  // Pass 1: fetch records and figure out how many photos need downloading.
  const plans: {
    sheet: string;
    records: { rec: NcRecord; atts: NcAttachment[]; sig: string; reuse: CachedRow | null }[];
  }[] = [];
  let totalDownloads = 0;

  for (const sheet of sheetNames) {
    const tableId = tables.get(sheet);
    if (!tableId) continue;
    const all = await listAllRecords(tableId, s);
    const published = all.filter(
      (r) =>
        String(r["Trang_thai"] ?? "") === "Da_duyet" &&
        String(r["Tinh"] ?? "") === province,
    );
    const oldRows = oldRowsBySheet.get(sheet) ?? new Map<number, CachedRow>();
    const records = published.map((rec) => {
      const atts = attList(rec["Anh"]);
      const sig = attSig(atts);
      const prev = oldRows.get(rec.Id);
      const reuse = prev && prev.sig === sig ? prev : null;
      if (!reuse) totalDownloads += atts.length;
      return { rec, atts, sig, reuse };
    });
    plans.push({ sheet, records });
  }

  // Pass 2: download changed photos + build the new index.
  const index: CacheIndex = {
    province,
    syncedAt: new Date().toISOString(),
    sheets: {},
  };
  let done = 0;
  let kept = 0;
  let removed = 0;

  for (const plan of plans) {
    const rows: CachedRow[] = [];
    for (const { rec, atts, sig, reuse } of plan.records) {
      if (reuse) {
        kept += reuse.photos.length;
        rows.push({ ...reuse, fields: recFields(rec), updatedAt: String(rec.UpdatedAt ?? "") });
        continue;
      }
      const relDir = `photos/${plan.sheet}/${rec.Id}`;
      const absDir = join(paths.cacheDir(province), relDir);
      if (await exists(absDir)) await remove(absDir, { recursive: true });
      const photos: string[] = [];
      if (atts.length) {
        await ensureDir(absDir);
        for (let i = 0; i < atts.length; i++) {
          const att = atts[i]!;
          try {
            const bytes = await fetchAttachment(att, s);
            const rel = `${relDir}/${i}.${extOf(att)}`;
            await writeBytes(join(paths.cacheDir(province), rel), bytes);
            photos.push(rel);
          } catch {
            // skip broken attachment; row still usable
          }
          done++;
          opts.onProgress?.(done, totalDownloads, `${plan.sheet} #${rec.Id}`);
        }
      }
      rows.push({
        id: rec.Id,
        updatedAt: String(rec.UpdatedAt ?? ""),
        fields: recFields(rec),
        photos,
        sig,
      });
    }

    // Records gone from the server: clean their cached photos.
    const newIds = new Set(rows.map((r) => r.id));
    for (const [id, prev] of oldRowsBySheet.get(plan.sheet) ?? []) {
      if (newIds.has(id)) continue;
      removed++;
      const dir = join(paths.cacheDir(province), `photos/${plan.sheet}/${id}`);
      if (await exists(dir)) await remove(dir, { recursive: true });
      void prev;
    }

    index.sheets[plan.sheet] = { rows };
  }

  await writeText(join(cacheDir, "index.json"), JSON.stringify(index));

  return {
    sheets: plans.length,
    rows: plans.reduce((n, p) => n + p.records.length, 0),
    photosDownloaded: done,
    photosKept: kept,
    removedRecords: removed,
  };
}

function recFields(rec: NcRecord): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (k === "Anh" || k === "Id") continue;
    if (v == null || typeof v === "object") continue;
    out[k] = String(v);
  }
  return out;
}
