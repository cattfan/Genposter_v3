/**
 * Shared shapes for "canonical, mapping.yaml-normalized" row data. The app
 * itself now reads exclusively from the synced server cache (see sync.ts /
 * generate.ts) — direct Excel parsing was removed here since nothing in the
 * app imported it anymore; the standalone data/mapping sanity check lives in
 * audit-data.cjs and reads the workbook itself.
 */

export interface SheetInfo {
  sheet: string;
  label: string;
  photos: string | null;
  rows: number;
  columns: string[];
}

export interface CanonRow {
  [field: string]: unknown;
  _raw: Record<string, unknown>;
}
