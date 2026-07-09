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
import { ensureDir, exists, readText, remove, rename, writeBytes, writeText } from "./fsx.js";
import type { SheetInfo } from "./excel.js";
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
  /** Fingerprint of published server rows — used to detect stale cache. */
  serverFingerprint?: string;
  serverRowCount?: number;
  sheets: Record<string, { rows: CachedRow[] }>;
}

export type UpdateReason =
  /** Cache khớp server. */
  | "ok"
  /** Server có dữ liệu mới (hoặc còn ảnh tải dở cần retry). */
  | "stale"
  /** Chưa có cache local — cần sync lần đầu. */
  | "no-cache"
  /** Không kết nối được server (mất mạng / chưa cấu hình) — dùng cache. */
  | "offline";

export interface ServerUpdateStatus {
  stale: boolean;
  reason: UpdateReason;
  syncedAt: string | null;
  serverRows: number;
  localRows: number;
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
  /** Sheets in mapping.yaml with no matching table on the server this run. */
  missingSheets: string[];
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

/**
 * In-memory copy of the last-loaded index, keyed by province. Avoids
 * re-reading + re-parsing a potentially multi-MB index.json on every sheet
 * switch / grid load — invalidated by invalidateCacheIndex() once a sync
 * writes a fresh one.
 */
let indexCache: { province: string; index: CacheIndex } | null = null;

export function invalidateCacheIndex(): void {
  indexCache = null;
}

export async function loadCacheIndex(province: string): Promise<CacheIndex | null> {
  if (indexCache?.province === province) return indexCache.index;
  const p = join(paths.cacheDir(province), "index.json");
  if (!(await exists(p))) return null;
  try {
    const index = JSON.parse(await readText(p)) as CacheIndex;
    indexCache = { province, index };
    return index;
  } catch {
    return null;
  }
}

/** Sheet list + row counts from the local server cache (mapping.yaml drives labels). */
export async function listCachedSheets(): Promise<SheetInfo[]> {
  const province = settings().server.province || "dalat";
  const idx = await loadCacheIndex(province);
  const mapping = await loadMapping();
  return Object.entries(mapping.sheets).map(([name, sm]) => {
    const rows = idx?.sheets[name]?.rows ?? [];
    return {
      sheet: name,
      label: sm.label,
      photos: sm.photos,
      rows: rows.length,
      columns: rows[0] ? Object.keys(rows[0].fields) : [],
    };
  });
}

export async function cachedSheetColumns(sheet: string): Promise<string[]> {
  const province = settings().server.province || "dalat";
  const idx = await loadCacheIndex(province);
  const rows = idx?.sheets[sheet]?.rows ?? [];
  return rows[0] ? Object.keys(rows[0].fields) : [];
}

/** Sheet names from mapping.yaml (same order as server tables). */
export async function listCachedSheetNames(): Promise<string[]> {
  const mapping = await loadMapping();
  return Object.keys(mapping.sheets);
}

export const PHOTO_COL = "Anh";

export interface CachedSheetRowView {
  fields: Record<string, string>;
  /** Absolute paths to cached photo files. */
  photoPaths: string[];
}

export interface CachedSheetView {
  headers: string[];
  rows: CachedSheetRowView[];
}

/** Structured sheet data for the Data tab (includes photo paths). */
export async function cachedSheetView(sheet: string): Promise<CachedSheetView> {
  const province = settings().server.province || "dalat";
  const idx = await loadCacheIndex(province);
  const rows = idx?.sheets[sheet]?.rows ?? [];
  if (!rows.length) return { headers: [], rows: [] };
  const headers = [...Object.keys(rows[0]!.fields), PHOTO_COL];
  return {
    headers,
    rows: rows.map((r) => ({
      fields: r.fields,
      photoPaths: r.photos.map((rel) => join(paths.cacheDir(province), rel)),
    })),
  };
}

function rowFingerprint(sheet: string, rec: NcRecord, atts: NcAttachment[]): string {
  return `${sheet}:${rec.Id}:${String(rec.UpdatedAt ?? "")}:${attSig(atts)}`;
}

/** Columns needed to compute the fingerprint (light polling payload). */
const META_FIELDS = ["Id", "UpdatedAt", "Anh", "Trang_thai", "Tinh"];

/** Keeps cached rows for sheets whose NocoDB table was not found this run. */
export function restoreMissingSheetCache(
  index: CacheIndex,
  old: CacheIndex | null | undefined,
  missingSheets: string[],
): void {
  for (const sheet of missingSheets) {
    const oldRows = old?.sheets[sheet];
    if (oldRows) index.sheets[sheet] = oldRows;
  }
}

export async function buildSyncPlans(
  sheetNames: string[],
  tables: Map<string, string>,
  province: string,
  oldRowsBySheet: Map<string, Map<number, CachedRow>>,
  opts?: { metaOnly?: boolean },
): Promise<{
  plans: {
    sheet: string;
    records: { rec: NcRecord; atts: NcAttachment[]; sig: string; reuse: CachedRow | null }[];
  }[];
  fingerprint: string;
  serverRowCount: number;
  totalDownloads: number;
  /** mapping.yaml sheets with no matching table in `tables` this run. */
  missingSheets: string[];
}> {
  const s = settings().server;
  const fpParts: string[] = [];
  let serverRowCount = 0;
  let totalDownloads = 0;
  const plans: {
    sheet: string;
    records: { rec: NcRecord; atts: NcAttachment[]; sig: string; reuse: CachedRow | null }[];
  }[] = [];
  const missingSheets: string[] = [];

  for (const sheet of sheetNames) {
    const tableId = tables.get(sheet);
    if (!tableId) {
      // A missing table (typo, not created yet, wrong base) must not delete
      // this sheet's already-cached rows — see doSyncProvince, which keeps
      // the old rows for any sheet reported here instead of dropping them.
      missingSheets.push(sheet);
      continue;
    }
    const all = await listAllRecords(tableId, s, opts?.metaOnly ? META_FIELDS : undefined);
    const published = all.filter(
      (r) =>
        String(r["Trang_thai"] ?? "") === "Da_duyet" &&
        String(r["Tinh"] ?? "") === province,
    );
    serverRowCount += published.length;
    const oldRows = oldRowsBySheet.get(sheet) ?? new Map<number, CachedRow>();
    const records = published.map((rec) => {
      const atts = attList(rec["Anh"]);
      fpParts.push(rowFingerprint(sheet, rec, atts));
      const sig = attSig(atts);
      const prev = oldRows.get(rec.Id);
      const reuse = prev && prev.sig === sig ? prev : null;
      if (!reuse) totalDownloads += atts.length;
      return { rec, atts, sig, reuse };
    });
    plans.push({ sheet, records });
  }

  fpParts.sort();
  return { plans, fingerprint: fpParts.join("\n"), serverRowCount, totalDownloads, missingSheets };
}

/**
 * Compare local cache with live server metadata (no photo download).
 * Never throws: network problems come back as reason "offline".
 */
export async function checkServerUpdates(): Promise<ServerUpdateStatus> {
  const s = settings().server;
  const province = s.province || "dalat";
  const idx = await loadCacheIndex(province);
  const localRows = Object.values(idx?.sheets ?? {}).reduce((n, sh) => n + sh.rows.length, 0);
  const syncedAt = idx?.syncedAt ?? null;

  if (!s.url || !s.token) {
    return { stale: false, reason: "offline", syncedAt, serverRows: 0, localRows };
  }

  try {
    const mapping = await loadMapping();
    const tables = await listServerTables(s);
    const oldRowsBySheet = new Map<string, Map<number, CachedRow>>();
    for (const [name, sh] of Object.entries(idx?.sheets ?? {})) {
      oldRowsBySheet.set(name, new Map(sh.rows.map((r) => [r.id, r])));
    }
    const { fingerprint, serverRowCount } = await buildSyncPlans(
      Object.keys(mapping.sheets),
      tables,
      province,
      oldRowsBySheet,
      { metaOnly: true },
    );

    if (!idx?.serverFingerprint) {
      return { stale: true, reason: "no-cache", syncedAt, serverRows: serverRowCount, localRows };
    }
    const stale = fingerprint !== idx.serverFingerprint;
    return {
      stale,
      reason: stale ? "stale" : "ok",
      syncedAt,
      serverRows: serverRowCount,
      localRows,
    };
  } catch {
    return { stale: false, reason: "offline", syncedAt, serverRows: 0, localRows };
  }
}

/** Module-level lock: a second call while syncing joins the running sync. */
let syncInFlight: Promise<SyncResult> | null = null;

/** Full sync pass; incremental on photos. Returns summary counts. */
export function syncProvince(opts: SyncProgress = {}): Promise<SyncResult> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = doSyncProvince(opts).finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

async function doSyncProvince(opts: SyncProgress): Promise<SyncResult> {
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

  const { plans, fingerprint, serverRowCount, totalDownloads, missingSheets } =
    await buildSyncPlans(sheetNames, tables, province, oldRowsBySheet);

  // Pass 2: download changed photos + build the new index.
  const index: CacheIndex = {
    province,
    syncedAt: new Date().toISOString(),
    serverFingerprint: fingerprint,
    serverRowCount,
    sheets: {},
  };
  let done = 0;
  let kept = 0;
  let removed = 0;
  let failedDownloads = 0;

  for (const plan of plans) {
    const rows: CachedRow[] = [];
    const oldRows = oldRowsBySheet.get(plan.sheet);
    for (const { rec, atts, sig, reuse } of plan.records) {
      if (reuse) {
        kept += reuse.photos.length;
        rows.push({ ...reuse, fields: recFields(rec), updatedAt: String(rec.UpdatedAt ?? "") });
        continue;
      }
      const relDir = `photos/${plan.sheet}/${rec.Id}`;
      const absDir = join(paths.cacheDir(province), relDir);
      const tmpDir = `${absDir}.tmp`;
      let photos: string[] = [];
      let failed = 0;
      if (atts.length) {
        // Download into a temp dir first; the old photos stay intact until
        // everything for this record has arrived (safe against mid-sync cuts).
        if (await exists(tmpDir)) await remove(tmpDir, { recursive: true });
        await ensureDir(tmpDir);
        for (let i = 0; i < atts.length; i++) {
          const att = atts[i]!;
          try {
            const bytes = await fetchAttachment(att, s);
            await writeBytes(join(tmpDir, `${i}.${extOf(att)}`), bytes);
            photos.push(`${relDir}/${i}.${extOf(att)}`);
          } catch (e) {
            // HTTP errors (broken attachment) are skipped and retried later;
            // network-level failures — including a stuck connection timing
            // out — abort the sync so the old cache survives instead of
            // marking many unrelated rows "failed" over one bad connection.
            const isNetworkFailure =
              e instanceof TypeError || (e instanceof DOMException && e.name === "TimeoutError");
            if (isNetworkFailure) throw e;
            failed++;
          }
          done++;
          opts.onProgress?.(done, totalDownloads, `${plan.sheet} #${rec.Id}`);
        }
        if (photos.length > 0 || failed === 0) {
          if (await exists(absDir)) await remove(absDir, { recursive: true });
          await rename(tmpDir, absDir);
        } else {
          // Nothing new arrived — keep whatever photos we already had.
          await remove(tmpDir, { recursive: true });
          photos = oldRows?.get(rec.Id)?.photos ?? [];
        }
      } else if (await exists(absDir)) {
        await remove(absDir, { recursive: true });
      }
      failedDownloads += failed;
      rows.push({
        id: rec.Id,
        updatedAt: String(rec.UpdatedAt ?? ""),
        fields: recFields(rec),
        photos,
        // An empty sig never matches the server signature, so rows with
        // failed downloads are retried on the next sync instead of reused.
        sig: failed === 0 ? sig : "",
      });
    }

    // Records gone from the server: clean their cached photos.
    const newIds = new Set(rows.map((r) => r.id));
    for (const id of (oldRowsBySheet.get(plan.sheet) ?? new Map()).keys()) {
      if (newIds.has(id)) continue;
      removed++;
      const dir = join(paths.cacheDir(province), `photos/${plan.sheet}/${id}`);
      if (await exists(dir)) await remove(dir, { recursive: true });
    }

    index.sheets[plan.sheet] = { rows };
  }

  // Keep whatever was already cached for sheets missing from the server
  // instead of silently deleting them — buildSyncPlans skipped these because
  // no matching table was found (typo, not created yet, wrong base).
  restoreMissingSheetCache(index, old, missingSheets);

  // A fingerprint that can't match the server forces a stale status, so the
  // next poll retries the rows whose downloads failed.
  if (failedDownloads > 0) {
    index.serverFingerprint = `${fingerprint}\n!retry:${failedDownloads}`;
  }

  // Atomic index write: temp file + rename, so a crash can't truncate it.
  const idxPath = join(cacheDir, "index.json");
  const idxTmp = `${idxPath}.tmp`;
  await writeText(idxTmp, JSON.stringify(index));
  await rename(idxTmp, idxPath);
  // Update the in-memory cache with what we just wrote instead of merely
  // invalidating it — the very next read (e.g. the Data tab refreshing right
  // after this sync) would otherwise re-read + re-parse the file we just wrote.
  indexCache = { province, index };

  return {
    sheets: plans.length,
    rows: plans.reduce((n, p) => n + p.records.length, 0),
    photosDownloaded: done - failedDownloads,
    photosKept: kept,
    removedRecords: removed,
    missingSheets,
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
