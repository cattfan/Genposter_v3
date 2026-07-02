import * as XLSX from "xlsx";
import type { MappingSheet } from "@genposter/schema";

import { readBytes } from "./fsx.js";
import { loadMapping } from "./mapping.js";
import { paths } from "./paths.js";

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

let wbCache: { mtimeKey: string; wb: XLSX.WorkBook } | null = null;

async function workbook(): Promise<XLSX.WorkBook> {
  const m = await loadMapping();
  const path = paths.database(m.database);
  const bytes = await readBytes(path);
  // Cheap cache key on byte length; reload happens when file size changes.
  const key = `${path}:${bytes.length}`;
  if (wbCache && wbCache.mtimeKey === key) return wbCache.wb;
  const wb = XLSX.read(bytes, { type: "array" });
  wbCache = { mtimeKey: key, wb };
  return wb;
}

export function clearWorkbookCache(): void {
  wbCache = null;
}

function clean(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function rowsOf(ws: XLSX.WorkSheet): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json(ws, { defval: "", raw: false }) as Record<
    string,
    unknown
  >[];
}

export async function readSheetRaw(sheet: string): Promise<Record<string, unknown>[]> {
  const wb = await workbook();
  const ws = wb.Sheets[sheet];
  if (!ws) throw new Error(`Sheet không tồn tại trong Excel: ${sheet}`);
  return rowsOf(ws);
}

export async function listSheets(): Promise<SheetInfo[]> {
  const m = await loadMapping();
  const wb = await workbook();
  const out: SheetInfo[] = [];
  for (const [name, sm] of Object.entries(m.sheets)) {
    const ws = wb.Sheets[name];
    let rows = 0;
    let columns: string[] = [];
    if (ws) {
      const json = rowsOf(ws);
      rows = json.length;
      columns = json.length ? Object.keys(json[0]!) : [];
    }
    out.push({ sheet: name, label: sm.label, photos: sm.photos, rows, columns });
  }
  return out;
}

export async function sheetColumns(sheet: string): Promise<string[]> {
  const rows = await readSheetRaw(sheet);
  return rows.length ? Object.keys(rows[0]!) : [];
}

/** Every sheet name in the workbook, in file order (not just mapped ones). */
export async function listAllSheetNames(): Promise<string[]> {
  const wb = await workbook();
  return [...wb.SheetNames];
}

/**
 * Raw 2D grid of a sheet exactly as laid out in the file (row 0 = header row),
 * preserving column order — for the spreadsheet-style Data tab.
 */
export async function sheetGrid(sheet: string): Promise<string[][]> {
  const wb = await workbook();
  const ws = wb.Sheets[sheet];
  if (!ws) throw new Error(`Sheet không tồn tại trong Excel: ${sheet}`);
  const rows = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
  return rows.map((r) => r.map((c) => (c == null ? "" : String(c))));
}

/** Map raw rows to canonical fields defined in mapping.yaml; keep _raw for filtering. */
export async function canonicalRows(
  sheet: string,
): Promise<{ map: MappingSheet; rows: CanonRow[] }> {
  const m = await loadMapping();
  const sm = m.sheets[sheet];
  if (!sm) throw new Error(`Sheet không có trong mapping.yaml: ${sheet}`);
  const raw = await readSheetRaw(sheet);
  const rows: CanonRow[] = raw.map((r) => {
    const item: CanonRow = { _raw: r };
    for (const [canon, header] of Object.entries(sm.fields)) {
      item[canon] = clean(r[header]);
    }
    return item;
  });
  return { map: sm, rows };
}
