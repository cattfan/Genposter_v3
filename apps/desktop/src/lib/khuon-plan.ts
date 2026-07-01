import type {
  DataGroupDef,
  DataRow,
  FabricScene,
  GeneratedPage,
  GeneratedSet,
  TemplateSet,
} from "@genposter/schema";

import { migrateSceneDataGroups } from "./scene-groups.js";

export interface KhuonPagePlan {
  pageId: string;
  /** Migrated scene (dataGroups guaranteed present). */
  scene: FabricScene;
  groups: DataGroupDef[];
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

/** Walk every page of the set, computing how many rows each group needs. */
export function buildKhuonPlan(set: TemplateSet): KhuonPlan {
  const pages: KhuonPagePlan[] = [];
  const slots: SlotSpec[] = [];

  for (const page of set.pages) {
    const scene = migrateSceneDataGroups(page.scene);
    const groups = (scene.dataGroups as DataGroupDef[] | undefined) ?? [];
    pages.push({ pageId: page.id, scene, groups });

    for (const g of groups) {
      if (!g.memberIds.length) continue;
      const count = g.mode === "repeat" ? Math.max(0, g.repeat?.maxRows ?? 0) : 1;
      if (count > 0) slots.push({ pageId: page.id, groupId: g.id, count });
    }
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

    const pages: GeneratedPage[] = plan.pages.map((pp) => ({
      pageId: pp.pageId,
      groups: pp.groups
        .filter((g) => bySlot.has(`${pp.pageId}::${g.id}`))
        .map((g) => ({ groupId: g.id, rows: bySlot.get(`${pp.pageId}::${g.id}`)! })),
    }));

    sets.push({ setIndex: k + 1, pages, setPhotos: collectSetPhotos(picked, perSet) });
  }

  return sets;
}
