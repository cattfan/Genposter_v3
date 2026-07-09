import type {
  DataGroupDef,
  DataRow,
  FabricScene,
  GeneratedPage,
  TemplateSet,
} from "@genposter/schema";

import { aiKey } from "../../lib/bind.js";
import { loadPreviewRows } from "../../lib/generate.js";
import { loadMapping } from "../../lib/mapping.js";
import { buildKhuonPlan, PAGE_SOLO_GROUP, type KhuonPlan } from "../../lib/khuon-plan.js";
import { renderPageCanvas } from "../../lib/render.js";
import { migrateSceneDataGroups } from "../../lib/scene-groups.js";
import { derivePhotoCounts } from "../produce/preset-utils.js";

const MOCK_ROW: DataRow = {
  photos: [],
  n: "1",
  name: "Quán mẫu",
  address: "123 Đường ABC, Đà Lạt",
  price: "99.000đ",
  price_pp: "50.000đ/p",
  desc: "Mô tả ngẫu nhiên cho preview thiết kế.",
};

export type PreviewDataSource = "cache" | "excel" | "mock";

export interface SamplePreviewContext {
  sheet: string;
  sheets: { value: string; label: string }[];
  rows: DataRow[];
  source: PreviewDataSource;
}

function buildBindsFromScene(scene: FabricScene): Map<string, string> {
  const binds = new Map<string, string>();
  const objects = (scene.objects ?? []) as Record<string, unknown>[];
  for (const raw of objects) {
    const id = raw.id;
    const gpBind = raw.gpBind;
    if (typeof id === "string" && typeof gpBind === "string" && gpBind) {
      binds.set(id, gpBind);
    }
  }
  return binds;
}

function buildBindsMap(
  scene: FabricScene,
  recipeBindings?: Record<string, string>,
): Map<string, string> {
  if (!recipeBindings) return buildBindsFromScene(scene);
  const binds = new Map<string, string>();
  for (const [id, bind] of Object.entries(recipeBindings)) {
    if (bind) binds.set(id, bind);
  }
  return binds;
}

/**
 * Pick `count` distinct rows starting near `startIndex` — mirrors
 * generateSets, which shuffles and takes a distinct slice with no
 * wrap-around. The previous modulo-wrap version could repeat the same row
 * twice within one preview "set" once `startIndex` got close to the end,
 * showing a duplicate item that an actual generate run would never produce.
 */
export function pickSetRows(allRows: DataRow[], startIndex: number, count: number): DataRow[] {
  if (!allRows.length || count <= 0) return [];
  const n = Math.min(count, allRows.length);
  const maxStart = Math.max(0, allRows.length - n);
  const start = Math.min(Math.max(0, startIndex), maxStart);
  return allRows.slice(start, start + n);
}

function collectSetPhotos(rows: DataRow[], perSet: number): string[] {
  const out: string[] = [];
  if (perSet <= 0) return out;
  for (const r of rows) {
    for (const p of r.photos) {
      if (!out.includes(p)) out.push(p);
      if (out.length >= perSet) return out;
    }
  }
  return out;
}

/** Slice rows into page groups following khuôn plan slot order (mirrors generateSets). */
function buildGenPageForPreview(
  plan: KhuonPlan,
  pageId: string,
  allRows: DataRow[],
  startRowIndex: number,
  perSet: number,
): { genPage: GeneratedPage; setPhotos: string[] } {
  const needed = Math.max(1, plan.rowsNeededPerSet);
  const picked = pickSetRows(allRows, startRowIndex, needed);
  const setPhotos = collectSetPhotos(picked, perSet);

  const bySlot = new Map<string, DataRow[]>();
  let cursor = 0;
  for (const s of plan.slots) {
    bySlot.set(`${s.pageId}::${s.groupId}`, picked.slice(cursor, cursor + s.count));
    cursor += s.count;
  }

  const pp = plan.pages.find((p) => p.pageId === pageId);
  if (!pp) return { genPage: { pageId, groups: [] }, setPhotos };

  const groups = pp.groups
    .filter((g) => bySlot.has(`${pageId}::${g.id}`))
    .map((g) => ({ groupId: g.id, rows: bySlot.get(`${pageId}::${g.id}`)! }));
  const solo = bySlot.get(`${pageId}::${PAGE_SOLO_GROUP}`);
  if (solo?.length) groups.push({ groupId: PAGE_SOLO_GROUP, rows: solo });

  return { genPage: { pageId, groups }, setPhotos };
}

export async function loadSamplePreviewContext(sheet?: string): Promise<SamplePreviewContext> {
  const mapping = await loadMapping();
  const sheetNames = Object.keys(mapping.sheets);
  const sheets = sheetNames.map((name) => ({
    value: name,
    label: mapping.sheets[name]!.label,
  }));

  const targetSheet = sheet || sheetNames[0] || "";
  if (!targetSheet) {
    return { sheet: "", sheets, rows: [MOCK_ROW], source: "mock" };
  }

  try {
    const rows = await loadPreviewRows(targetSheet, { perItem: 3 });
    if (rows.length) {
      return { sheet: targetSheet, sheets, rows, source: "cache" };
    }
  } catch {
    /* fall through */
  }

  return { sheet: targetSheet, sheets, rows: [MOCK_ROW], source: "mock" };
}

export interface DesignPreviewOpts {
  perSet?: number;
  bindings?: Record<string, string>;
}

/** Render one page with sample data bindings (read-only preview). */
export async function renderDesignDataPreview(
  set: TemplateSet,
  pageIndex: number,
  allRows: DataRow[],
  startRowIndex: number,
  opts?: DesignPreviewOpts,
): Promise<string> {
  const page = set.pages[pageIndex];
  if (!page || !allRows.length) return "";

  const scene = migrateSceneDataGroups(page.scene);
  const groups = (scene.dataGroups as DataGroupDef[] | undefined) ?? [];
  const bindings = opts?.bindings ?? Object.fromEntries(buildBindsFromScene(scene));
  const plan = buildKhuonPlan(set, bindings);
  const { genPage, setPhotos } = buildGenPageForPreview(
    plan,
    page.id,
    allRows,
    startRowIndex,
    opts?.perSet ?? 1,
  );
  const binds = buildBindsMap(scene, opts?.bindings);

  const canvas = await renderPageCanvas(
    set.width,
    set.height,
    scene,
    groups,
    genPage,
    setPhotos,
    binds,
  );
  const dataUrl = canvas.toDataURL({
    format: "jpeg",
    quality: 0.88,
    multiplier: 1,
    enableRetinaScaling: false,
  });
  canvas.dispose();
  return dataUrl;
}

/**
 * ai:-bound elements only get their real text from applyAiBindings at
 * generate time (calling the AI API on every preview keystroke would be
 * slow/expensive) — stand in with an explanatory hint instead of leaving
 * the box looking blank/broken in "Xem với dữ liệu".
 */
const AI_PREVIEW_HINT = "(AI sẽ sinh khi Xuất ảnh)";

function withAiPreviewHints(rows: DataRow[], bindings: Record<string, string>): DataRow[] {
  const aiElementIds = Object.keys(bindings).filter((id) => bindings[id]?.startsWith("ai:"));
  if (!aiElementIds.length) return rows;
  const patch = Object.fromEntries(aiElementIds.map((id) => [aiKey(id), AI_PREVIEW_HINT]));
  return rows.map((r) => ({ ...r, ...patch }));
}

export interface ProducePreviewDraft {
  sheet: string;
  filterField: string;
  filterValue: string;
  limit: string;
  perItem: number;
  perSet: number;
  bindings: Record<string, string>;
}

/** Bound preview for Produce tab using recipe bindings + selected sheet. */
export async function renderProduceBoundPreview(
  set: TemplateSet,
  pageIndex: number,
  draft: ProducePreviewDraft,
  startRowIndex: number,
): Promise<string> {
  if (!draft.sheet) return "";

  const filter =
    draft.filterField && draft.filterValue
      ? { [draft.filterField]: draft.filterValue }
      : {};
  const limit = draft.limit ? Number(draft.limit) : null;
  const { perItem, perSet } = derivePhotoCounts(draft.bindings);
  const rows = await loadPreviewRows(draft.sheet, {
    filter,
    limit,
    perItem,
  });
  if (!rows.length) return "";

  return renderDesignDataPreview(
    set,
    pageIndex,
    withAiPreviewHints(rows, draft.bindings),
    startRowIndex,
    { perSet, bindings: draft.bindings },
  );
}
