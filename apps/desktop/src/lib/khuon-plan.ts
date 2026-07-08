import type {
  DataGroupDef,
  DataRow,
  FabricScene,
  GeneratedPage,
  GeneratedSet,
  TemplateSet,
} from "@genposter/schema";

import { bindNeedsRow } from "./bind.js";
import { migrateSceneDataGroups } from "./scene-groups.js";

/**
 * Pseudo group id for ungrouped ("solo") elements of a page. Pages whose solo
 * elements carry row-dependent bindings consume 1 data row per set, shared by
 * all solo elements on that page.
 */
export const PAGE_SOLO_GROUP = "__solo__";

export interface KhuonPagePlan {
  pageId: string;
  /** Migrated scene (dataGroups guaranteed present). */
  scene: FabricScene;
  groups: DataGroupDef[];
  /** Ungrouped element ids whose binding needs a data row. */
  soloIds: string[];
}

export interface SlotSpec {
  pageId: string;
  groupId: string;
  /** rows this group consumes per set (slot=1, repeat=maxRows). */
  count: number;
}

export interface KhuonPlan {
  pages: KhuonPagePlan[];
  slots: SlotSpec[];
  rowsNeededPerSet: number;
}

/**
 * Walk every page of the set, computing how many rows each group needs.
 * `bindings` (elementId -> bind token) lets the plan also reserve one row per
 * page for solo elements bound to row data (item.*, photo:item:*, n, ai:*);
 * design hints (gpBind) count as fallback, mirroring the renderer.
 */
export function buildKhuonPlan(
  set: TemplateSet,
  bindings?: Record<string, string>,
): KhuonPlan {
  const pages: KhuonPagePlan[] = [];
  const slots: SlotSpec[] = [];

  for (const page of set.pages) {
    const scene = migrateSceneDataGroups(page.scene);
    const groups = (scene.dataGroups as DataGroupDef[] | undefined) ?? [];

    const grouped = new Set(groups.flatMap((g) => g.memberIds));
    const soloIds: string[] = [];
    if (bindings) {
      for (const o of (scene.objects ?? []) as Record<string, unknown>[]) {
        const id = typeof o.id === "string" ? o.id : "";
        if (!id || grouped.has(id)) continue;
        const hint = typeof o.gpBind === "string" ? o.gpBind : "";
        const bind = bindings[id] ?? hint;
        if (bindNeedsRow(bind)) soloIds.push(id);
      }
    }
    pages.push({ pageId: page.id, scene, groups, soloIds });

    for (const g of groups) {
      if (!g.memberIds.length) continue;
      const count = g.mode === "repeat" ? Math.max(0, g.repeat?.maxRows ?? 0) : 1;
      if (count > 0) slots.push({ pageId: page.id, groupId: g.id, count });
    }
    if (soloIds.length) slots.push({ pageId: page.id, groupId: PAGE_SOLO_GROUP, count: 1 });
  }

  const rowsNeededPerSet = slots.reduce((sum, s) => sum + s.count, 0);
  return { pages, slots, rowsNeededPerSet };
}

/** Fisher–Yates using an injectable RNG (default Math.random). */
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
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

/**
 * Generate `setCount` sets. Each set shuffles candidates independently and
 * slices distinct rows into groups following the plan order — so no row
 * repeats within a set (rows may repeat across different sets).
 */
export function generateSets(
  plan: KhuonPlan,
  candidates: DataRow[],
  setCount: number,
  perSet: number,
  rng: () => number = Math.random,
): GeneratedSet[] {
  const sets: GeneratedSet[] = [];

  for (let k = 0; k < setCount; k++) {
    const picked = shuffle(candidates, rng).slice(0, plan.rowsNeededPerSet);

    const bySlot = new Map<string, DataRow[]>();
    let cursor = 0;
    for (const s of plan.slots) {
      bySlot.set(`${s.pageId}::${s.groupId}`, picked.slice(cursor, cursor + s.count));
      cursor += s.count;
    }

    const pages: GeneratedPage[] = plan.pages.map((pp) => {
      const groups = pp.groups
        .filter((g) => bySlot.has(`${pp.pageId}::${g.id}`))
        .map((g) => ({ groupId: g.id, rows: bySlot.get(`${pp.pageId}::${g.id}`)! }));
      const solo = bySlot.get(`${pp.pageId}::${PAGE_SOLO_GROUP}`);
      if (solo?.length) groups.push({ groupId: PAGE_SOLO_GROUP, rows: solo });
      return { pageId: pp.pageId, groups };
    });

    sets.push({ setIndex: k + 1, pages, setPhotos: collectSetPhotos(picked, perSet) });
  }

  return sets;
}
