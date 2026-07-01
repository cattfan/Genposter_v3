# Tab Tạo ảnh — Bộ khuôn nhiều trang + random-fill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đổi tab Tạo ảnh sang mô hình "bộ khuôn" (1 bộ mẫu nhiều trang), gán field theo từng trang, random-fill K bộ (không lặp dòng trong 1 bộ), xuất 1 file zip `bo{k}/anh{trang}`.

**Architecture:** Tách logic thuần (kế hoạch khuôn + random) khỏi I/O. `khuon-plan.ts` (thuần, test được) tính số slot/bộ và chia dòng ngẫu nhiên; `generate.ts` nạp Excel/ảnh và điều phối; `render.ts` vẽ từng trang bằng Fabric `StaticCanvas`; `zip.ts` nén bằng `fflate`. Schema thay `Slide*` bằng `GeneratedSet/GeneratedPage/GroupFill/DataRow`.

**Tech Stack:** TypeScript, React + Mantine v7, Fabric v6, xlsx, fflate, Tauri plugin-fs/plugin-dialog, Vitest.

---

## Bối cảnh & quy ước

- Chưa có file `recipes/*.yaml` nào → được phép đổi shape Recipe thoải mái, không cần migrate recipe cũ.
- Test chạy môi trường **node** (`vitest.config.ts` include `src/**/*.test.ts`, alias `@genposter/schema` → source). Vì vậy các module test được **không** được import `fabric` hay `@tauri-apps/*`.
- Lệnh test một file: `pnpm --filter @genposter/desktop test src/lib/<ten>.test.ts`
- Lệnh typecheck: `pnpm --filter @genposter/desktop typecheck`
- Import nội bộ dùng đuôi `.js` (ESM), khớp code hiện có.

## Bản đồ file

| File | Trách nhiệm | Hành động |
|------|-------------|-----------|
| `packages/schema/src/index.ts` | Kiểu Recipe + kiểu sinh dữ liệu | Sửa (bỏ `Slide*`/`ListRowConfig`/`SLIDE_BIND_OPTIONS`, thêm `DataRow`/`GroupFill`/`GeneratedPage`/`GeneratedSet`/`GeneratePayload`) |
| `apps/desktop/src/lib/bind.ts` | Resolve token theo `DataRow` | Sửa `BindContext`, `resolveText`, `resolvePhoto` |
| `apps/desktop/src/lib/khuon-plan.ts` | Thuần: kế hoạch khuôn + random-fill | **Mới** |
| `apps/desktop/src/lib/zip.ts` | Nén zip + tên file theo thời điểm | **Mới** |
| `apps/desktop/src/lib/generate.ts` | Async: nạp dữ liệu + điều phối sinh | **Mới** (thay `build.ts`) |
| `apps/desktop/src/lib/build.ts` | (cũ) pagination Slide | **Xoá** |
| `apps/desktop/src/lib/ai.ts` | AI text theo `DataRow` | Sửa chữ ký |
| `apps/desktop/src/lib/render.ts` | Vẽ trang + gom zip | Viết lại phần render |
| `apps/desktop/src/lib/recipe-io.ts` | YAML recipe | Sửa (bỏ list_row/title/subtitle/items_per_slide; thêm random_set_count; per_set) |
| `apps/desktop/src/lib/template-io.ts` | (cũ) làm phẳng trang cho Produce | **Xoá** |
| `apps/desktop/src/features/produce/elements.ts` | Trích element theo trang | Sửa (bỏ `listRow`, thêm `extractSetPages`) |
| `apps/desktop/src/features/produce/preset-utils.ts` | Draft ↔ Recipe | Sửa |
| `apps/desktop/src/features/produce/options.ts` | Option dropdown bind | Sửa (`photo:set`, bỏ slide options) |
| `apps/desktop/src/features/produce/ProduceBindingsPanel.tsx` | Bảng gán 1 trang | Sửa nhẹ |
| `apps/desktop/src/features/produce/ProduceTab.tsx` | Layout mới + Sinh & Xuất | Viết lại |
| `apps/desktop/package.json` | Thêm `fflate` | Sửa |

---

## Task 1: Thêm dependency `fflate`

**Files:**
- Modify: `apps/desktop/package.json`

- [ ] **Step 1: Cài fflate**

Run: `pnpm --filter @genposter/desktop add fflate`
Expected: `package.json` có `"fflate"` trong `dependencies`, lockfile cập nhật, không lỗi.

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/package.json pnpm-lock.yaml
git commit -m "chore(produce): add fflate for zip export"
```

---

## Task 2: Schema — kiểu sinh dữ liệu mới + sửa Recipe

**Files:**
- Modify: `packages/schema/src/index.ts`

- [ ] **Step 1: Thay khối "Slide data" bằng kiểu sinh dữ liệu mới**

Tìm khối bắt đầu `// Slide data (built from Excel...)` tới hết `SlidePayload` (các interface `SlideItem`, `Slide`, `SlidePayload`) và **thay toàn bộ** bằng:

```ts
// ---------------------------------------------------------------------------
// Generated data (built from Excel at produce time, random-filled per set)
// ---------------------------------------------------------------------------

/** One resolved data row: canonical fields (flat) + resolved photo paths. */
export interface DataRow {
  photos: string[];
  [field: string]: unknown;
}

/** Rows assigned to one data group on one page within one set. */
export interface GroupFill {
  groupId: string;
  /** slot mode: exactly 1 row; repeat mode: one row per repeated line. */
  rows: DataRow[];
}

/** One page of a set, with its groups filled. */
export interface GeneratedPage {
  pageId: string;
  groups: GroupFill[];
}

/** One set = one independent random draw covering every page of the khuôn. */
export interface GeneratedSet {
  /** 1-based. */
  setIndex: number;
  pages: GeneratedPage[];
  /** Set-level illustrative photos (token photo:set:i). */
  setPhotos: string[];
}

export interface GeneratePayload {
  recipeId: string;
  templateId: string;
  sheet: string;
  rowsNeededPerSet: number;
  sets: GeneratedSet[];
}
```

- [ ] **Step 2: Bỏ `ListRowConfig` và sửa `Recipe`**

Thay khối `ListRowConfig` + `Recipe` (giữ `ElementBinding`, `RecipeOutput`) bằng:

```ts
export interface ElementBinding {
  elementId: string;
  bind: string;
  label?: string;
}

export interface RecipeOutput {
  dir: string;
  format: "jpg" | "png";
  quality: number;
}

export interface Recipe {
  id: string;
  name: string;
  /** TemplateSet id (whole multi-page khuôn). */
  templateId: string;
  data: {
    sheet: string;
    filter: Record<string, string>;
    limit: number | null;
  };
  photos: {
    /** photos resolved per data row (token photo:item:i). */
    perItem: number;
    /** photos gathered per set (token photo:set:i). */
    perSet: number;
  };
  /** How many sets to generate per run. */
  randomSetCount: number;
  bindings: ElementBinding[];
  output: RecipeOutput;
}
```

Cập nhật comment "grammar" phía trên `ElementBinding`: đổi `photo:slide:<i>` thành `photo:set:<i>`, và bỏ dòng `title | subtitle | page | pages | n` chỉ còn `n` (STT) — thay đoạn:

```
 *  - "title" | "subtitle" | "page" | "pages" | "n"
 *  - "item.<field>"     canonical item field (name, address, price, ...)
 *  - "photo:item:<i>"   i-th photo of the current item
 *  - "photo:slide:<i>"  i-th slide-level photo
```

thành:

```
 *  - "n"                1-based ordinal within a repeat group
 *  - "item.<field>"     canonical field of the assigned data row
 *  - "photo:item:<i>"   i-th photo of the assigned data row
 *  - "photo:set:<i>"    i-th set-level photo
```

- [ ] **Step 3: Bỏ `SLIDE_BIND_OPTIONS`**

Xoá nguyên khối:

```ts
export const SLIDE_BIND_OPTIONS: { bind: string; label: string }[] = [
  { bind: "title", label: "Tiêu đề slide" },
  { bind: "subtitle", label: "Phụ đề" },
  { bind: "page", label: "Trang (số)" },
  { bind: "pages", label: "Tổng số trang" },
];
```

(Giữ `FIELD_LABELS`, `CANVAS_W/H`, `BRAND_ORANGE`, `DEFAULT_TEMPLATE_W/H`.)

- [ ] **Step 4: Typecheck (dự kiến còn lỗi ở nơi dùng kiểu cũ)**

Run: `pnpm --filter @genposter/desktop typecheck`
Expected: FAIL — lỗi ở `bind.ts`, `build.ts`, `ai.ts`, `render.ts`, `recipe-io.ts`, `options.ts`, `preset-utils.ts`, `ProduceTab.tsx` (các task sau sửa hết). Đây là mốc đã biết, tiếp tục.

- [ ] **Step 5: Commit**

```bash
git add packages/schema/src/index.ts
git commit -m "feat(schema): generated-set types, khuon Recipe shape"
```

---

## Task 3: `bind.ts` — resolve theo `DataRow`

**Files:**
- Modify: `apps/desktop/src/lib/bind.ts`
- Test: `apps/desktop/src/lib/bind.test.ts`

- [ ] **Step 1: Viết test thất bại**

Create `apps/desktop/src/lib/bind.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { DataRow } from "@genposter/schema";
import { resolvePhoto, resolveText } from "./bind.js";

const row: DataRow = { name: "Quán A", price: "50k", photos: ["/a.jpg", "/b.jpg"] };

describe("resolveText", () => {
  it("static returns literal", () => {
    expect(resolveText("static:Xin chào", {})).toBe("Xin chào");
  });
  it("item.field reads the row", () => {
    expect(resolveText("item.name", { row })).toBe("Quán A");
  });
  it("missing field is empty", () => {
    expect(resolveText("item.zzz", { row })).toBe("");
  });
  it("n reads ordinal", () => {
    expect(resolveText("n", { n: 3 })).toBe("3");
  });
  it("photo token resolves to empty text", () => {
    expect(resolveText("photo:item:0", { row })).toBe("");
  });
});

describe("resolvePhoto", () => {
  it("photo:item:i reads row photos", () => {
    expect(resolvePhoto("photo:item:1", { row })).toBe("/b.jpg");
  });
  it("photo:set:i reads set photos", () => {
    expect(resolvePhoto("photo:set:0", { setPhotos: ["/s.jpg"] })).toBe("/s.jpg");
  });
  it("out of range is null", () => {
    expect(resolvePhoto("photo:item:9", { row })).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test — thất bại**

Run: `pnpm --filter @genposter/desktop test src/lib/bind.test.ts`
Expected: FAIL (chữ ký cũ dùng `ctx.slide`/`ctx.item`).

- [ ] **Step 3: Viết lại `bind.ts`**

Thay toàn bộ nội dung `apps/desktop/src/lib/bind.ts`:

```ts
import type { DataRow } from "@genposter/schema";

export interface BindContext {
  /** The data row assigned to the current group member (if any). */
  row?: DataRow;
  /** Set-level photos (token photo:set:i). */
  setPhotos?: string[];
  /** 1-based ordinal within a repeat group. */
  n?: number;
}

/** Key under which AI-generated text is stashed on a row (per element). */
export function aiKey(elementId: string): string {
  return `__ai__${elementId}`;
}

/** Resolve a text binding token to a string. */
export function resolveText(bind: string, ctx: BindContext, elementId?: string): string {
  if (!bind) return "";
  if (bind.startsWith("static:")) return bind.slice(7);
  if (bind.startsWith("photo:")) return "";
  if (bind.startsWith("ai:")) {
    if (elementId && ctx.row) {
      const v = ctx.row[aiKey(elementId)];
      if (v != null) return String(v);
    }
    return "";
  }
  if (bind === "n") return String(ctx.n ?? "");
  if (bind.startsWith("item.")) {
    const v = ctx.row?.[bind.slice(5)];
    return v == null ? "" : String(v);
  }
  return "";
}

/** Resolve a photo binding token to an absolute path (or null). */
export function resolvePhoto(bind: string, ctx: BindContext): string | null {
  const m = bind.match(/^photo:(item|set):(\d+)$/);
  if (!m) return null;
  const idx = parseInt(m[2]!, 10) || 0;
  const arr = m[1] === "item" ? ctx.row?.photos ?? [] : ctx.setPhotos ?? [];
  return arr[idx] ?? null;
}

/** Fill {{token}} placeholders (used by AI prompt templates). */
export function fillTokens(tpl: string, ctx: BindContext): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    return resolveText(key, ctx);
  });
}
```

- [ ] **Step 4: Chạy test — pass**

Run: `pnpm --filter @genposter/desktop test src/lib/bind.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/lib/bind.ts apps/desktop/src/lib/bind.test.ts
git commit -m "feat(produce): bind tokens resolve against DataRow"
```

---

## Task 4: `khuon-plan.ts` — kế hoạch khuôn + random-fill (thuần)

**Files:**
- Create: `apps/desktop/src/lib/khuon-plan.ts`
- Test: `apps/desktop/src/lib/khuon-plan.test.ts`

- [ ] **Step 1: Viết test thất bại**

Create `apps/desktop/src/lib/khuon-plan.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { DataRow, TemplateSet } from "@genposter/schema";
import { buildKhuonPlan, generateSets } from "./khuon-plan.js";

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const set: TemplateSet = {
  id: "s",
  name: "S",
  width: 1000,
  height: 1000,
  pages: [
    {
      id: "p1",
      scene: {
        objects: [{ id: "a", gpDataGroup: "g_slot" }],
        dataGroups: [{ id: "g_slot", label: "Slot", memberIds: ["a"], mode: "slot" }],
      },
    },
    {
      id: "p2",
      scene: {
        objects: [{ id: "b", gpDataGroup: "g_rep" }],
        dataGroups: [
          {
            id: "g_rep",
            label: "Lặp",
            memberIds: ["b"],
            mode: "repeat",
            repeat: { rowHeight: 100, gap: 0, maxRows: 5 },
          },
        ],
      },
    },
  ],
};

const rows: DataRow[] = Array.from({ length: 20 }, (_, i) => ({
  name: `q${i}`,
  photos: [],
}));

describe("buildKhuonPlan", () => {
  it("sums slots across pages (1 slot + 5 repeat = 6)", () => {
    expect(buildKhuonPlan(set).rowsNeededPerSet).toBe(6);
  });
});

describe("generateSets", () => {
  it("creates the requested number of sets", () => {
    const out = generateSets(buildKhuonPlan(set), rows, 3, 0, mulberry32(1));
    expect(out).toHaveLength(3);
    expect(out[0]!.setIndex).toBe(1);
  });
  it("no data row repeats within one set", () => {
    const out = generateSets(buildKhuonPlan(set), rows, 1, 0, mulberry32(2));
    const used = out[0]!.pages.flatMap((p) => p.groups.flatMap((g) => g.rows.map((r) => r.name)));
    expect(used).toHaveLength(6);
    expect(new Set(used).size).toBe(6);
  });
  it("assigns 1 row to slot group and maxRows to repeat group", () => {
    const out = generateSets(buildKhuonPlan(set), rows, 1, 0, mulberry32(3));
    const p1 = out[0]!.pages.find((p) => p.pageId === "p1")!;
    const p2 = out[0]!.pages.find((p) => p.pageId === "p2")!;
    expect(p1.groups[0]!.rows).toHaveLength(1);
    expect(p2.groups[0]!.rows).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Chạy test — thất bại**

Run: `pnpm --filter @genposter/desktop test src/lib/khuon-plan.test.ts`
Expected: FAIL ("Cannot find module ./khuon-plan.js").

- [ ] **Step 3: Viết `khuon-plan.ts`**

Create `apps/desktop/src/lib/khuon-plan.ts`:

```ts
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
```

- [ ] **Step 4: Chạy test — pass**

Run: `pnpm --filter @genposter/desktop test src/lib/khuon-plan.test.ts`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/lib/khuon-plan.ts apps/desktop/src/lib/khuon-plan.test.ts
git commit -m "feat(produce): khuon plan + random-fill generator"
```

---

## Task 5: `zip.ts` — nén zip + tên file theo thời điểm

**Files:**
- Create: `apps/desktop/src/lib/zip.ts`
- Test: `apps/desktop/src/lib/zip.test.ts`

- [ ] **Step 1: Viết test thất bại**

Create `apps/desktop/src/lib/zip.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import { makeZip, timestampZipName } from "./zip.js";

describe("timestampZipName", () => {
  it("formats Genposter_YYYY-MM-DD_HH-MM.zip with no colons", () => {
    const name = timestampZipName(new Date(2026, 6, 1, 9, 5));
    expect(name).toBe("Genposter_2026-07-01_09-05.zip");
    expect(name).not.toContain(":");
  });
});

describe("makeZip", () => {
  it("round-trips files by path", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([9, 8]);
    const zipped = makeZip({ "bo01/anh01.jpg": a, "bo01/anh02.jpg": b });
    const back = unzipSync(zipped);
    expect(Array.from(back["bo01/anh01.jpg"]!)).toEqual([1, 2, 3]);
    expect(Array.from(back["bo01/anh02.jpg"]!)).toEqual([9, 8]);
  });
});
```

- [ ] **Step 2: Chạy test — thất bại**

Run: `pnpm --filter @genposter/desktop test src/lib/zip.test.ts`
Expected: FAIL ("Cannot find module ./zip.js").

- [ ] **Step 3: Viết `zip.ts`**

Create `apps/desktop/src/lib/zip.ts`:

```ts
import { zipSync } from "fflate";

/** Zip a map of in-zip-path -> bytes. Store level 6. */
export function makeZip(files: Record<string, Uint8Array>): Uint8Array {
  return zipSync(files, { level: 6 });
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Windows-safe zip file name: Genposter_YYYY-MM-DD_HH-MM.zip (no colons). */
export function timestampZipName(d: Date = new Date()): string {
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const time = `${pad2(d.getHours())}-${pad2(d.getMinutes())}`;
  return `Genposter_${date}_${time}.zip`;
}
```

- [ ] **Step 4: Chạy test — pass**

Run: `pnpm --filter @genposter/desktop test src/lib/zip.test.ts`
Expected: PASS (2 test).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/lib/zip.ts apps/desktop/src/lib/zip.test.ts
git commit -m "feat(produce): zip helper and timestamped name"
```

---

## Task 6: `ai.ts` + `generate.ts` — nạp dữ liệu & điều phối

**Files:**
- Modify: `apps/desktop/src/lib/ai.ts`
- Create: `apps/desktop/src/lib/generate.ts`
- Delete: `apps/desktop/src/lib/build.ts`

- [ ] **Step 1: Viết lại `ai.ts`**

Thay toàn bộ `apps/desktop/src/lib/ai.ts`:

```ts
import type { GeneratedSet, Recipe } from "@genposter/schema";

import { aiKey, fillTokens } from "./bind.js";
import type { KhuonPlan } from "./khuon-plan.js";
import { settings } from "./settings.js";

/**
 * AI text transform hook. For every binding shaped `ai:<prompt>`, generate text
 * per assigned row and stash it under aiKey(elementId) so the renderer can read
 * it. No-op when no API key is configured.
 */
export async function applyAiBindings(
  recipe: Recipe,
  sets: GeneratedSet[],
  plan: KhuonPlan,
): Promise<void> {
  const aiBinds = recipe.bindings.filter((b) => b.bind.startsWith("ai:"));
  if (!aiBinds.length) return;

  const cfg = settings().ai;
  if (!cfg.apiKey || !cfg.baseUrl) return; // framework present, generation disabled

  const promptByEl = new Map(aiBinds.map((b) => [b.elementId, b.bind.slice(3)]));
  const membersByPageGroup = new Map<string, string[]>();
  for (const p of plan.pages) {
    for (const g of p.groups) membersByPageGroup.set(`${p.pageId}::${g.id}`, g.memberIds);
  }

  for (const set of sets) {
    for (const page of set.pages) {
      for (const gf of page.groups) {
        const memberIds = membersByPageGroup.get(`${page.pageId}::${gf.groupId}`) ?? [];
        for (const elId of memberIds) {
          const prompt = promptByEl.get(elId);
          if (!prompt) continue;
          for (let i = 0; i < gf.rows.length; i++) {
            const row = gf.rows[i]!;
            const filled = fillTokens(prompt, { row, n: i + 1 });
            try {
              row[aiKey(elId)] = await complete(cfg, filled);
            } catch {
              row[aiKey(elId)] = "";
            }
          }
        }
      }
    }
  }
}

interface AiCfg {
  baseUrl: string;
  apiKey: string;
  model: string;
}

async function complete(cfg: AiCfg, prompt: string): Promise<string> {
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        {
          role: "system",
          content:
            "Bạn viết nội dung ngắn gọn cho ảnh poster du lịch tiếng Việt. Chỉ trả về văn bản, không giải thích.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return (data.choices?.[0]?.message?.content ?? "").trim();
}
```

- [ ] **Step 2: Viết `generate.ts`**

Create `apps/desktop/src/lib/generate.ts`:

```ts
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
```

- [ ] **Step 3: Xoá `build.ts`**

```bash
git rm apps/desktop/src/lib/build.ts
```

- [ ] **Step 4: Commit** (typecheck vẫn đỏ ở render/produce — sửa ở task sau)

```bash
git add apps/desktop/src/lib/ai.ts apps/desktop/src/lib/generate.ts
git commit -m "feat(produce): data-load + generate orchestration, drop build.ts"
```

---

## Task 7: `render.ts` — vẽ trang theo bộ + gom zip

**Files:**
- Modify: `apps/desktop/src/lib/render.ts`

- [ ] **Step 1: Viết lại `render.ts`**

Thay toàn bộ `apps/desktop/src/lib/render.ts`:

```ts
import * as fabric from "fabric";
import type {
  DataGroupDef,
  DataRow,
  ElementBinding,
  FabricScene,
  GeneratedPage,
  GeneratePayload,
  Recipe,
  TemplateSet,
} from "@genposter/schema";

import { resolvePhoto, resolveText, type BindContext } from "./bind.js";
import { CUSTOM_PROPS } from "./fabric-util.js";
import { ensureFonts } from "./fonts.js";
import { fitImageCover, getId, isImageType, isTextType } from "./fabric-util.js";
import { buildKhuonPlan } from "./khuon-plan.js";
import { groupMemberIdSet } from "./scene-groups.js";
import { dataUrlToBytes, assetUrl } from "./fsx.js";
import { makeZip } from "./zip.js";

const CLONE_PROPS = [...CUSTOM_PROPS];

function bindMap(bindings: ElementBinding[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const b of bindings) if (b.elementId && b.bind) m.set(b.elementId, b.bind);
  return m;
}

function bindForObject(obj: fabric.Object, binds: Map<string, string>): string {
  const id = getId(obj);
  const explicit = binds.get(id);
  if (explicit !== undefined) return explicit;
  const hint = (obj as unknown as { gpBind?: string }).gpBind;
  return hint ?? "";
}

async function applyBinding(
  obj: fabric.Object,
  bind: string,
  ctx: BindContext,
): Promise<void> {
  if (!bind) return;

  if (bind.startsWith("photo:")) {
    if (!isImageType(obj)) return;
    const path = resolvePhoto(bind, ctx);
    if (!path) return;
    const img = obj as fabric.FabricImage;
    const boxW = img.getScaledWidth();
    const boxH = img.getScaledHeight();
    const center = img.getCenterPoint();
    const angle = img.angle ?? 0;
    try {
      await img.setSrc(assetUrl(path), { crossOrigin: "anonymous" });
      fitImageCover(img, boxW, boxH);
      img.set({ angle });
      img.setPositionByOrigin(center, "center", "center");
      img.setCoords();
    } catch {
      // keep placeholder on failure
    }
    return;
  }

  if (isTextType(obj)) {
    const id = getId(obj);
    const text = resolveText(bind, ctx, id);
    (obj as fabric.Textbox).set({ text });
  }
}

function objectsById(canvas: fabric.StaticCanvas): Map<string, fabric.FabricObject> {
  const m = new Map<string, fabric.FabricObject>();
  for (const o of canvas.getObjects()) m.set(getId(o), o);
  return m;
}

async function bindSlotGroup(
  canvas: fabric.StaticCanvas,
  group: DataGroupDef,
  binds: Map<string, string>,
  row: DataRow,
  setPhotos: string[],
): Promise<void> {
  const byId = objectsById(canvas);
  for (const id of group.memberIds) {
    const obj = byId.get(id);
    if (!obj) continue;
    await applyBinding(obj, bindForObject(obj, binds), { row, n: 1, setPhotos });
  }
}

async function bindRepeatGroup(
  canvas: fabric.StaticCanvas,
  group: DataGroupDef,
  binds: Map<string, string>,
  rows: DataRow[],
  setPhotos: string[],
): Promise<void> {
  const step = (group.repeat?.rowHeight ?? 110) + (group.repeat?.gap ?? 0);
  const byId = objectsById(canvas);
  const members = group.memberIds
    .map((id) => byId.get(id))
    .filter((o): o is fabric.FabricObject => Boolean(o));
  if (!members.length || !rows.length) {
    for (const obj of members) canvas.remove(obj);
    return;
  }

  for (const obj of members) {
    await applyBinding(obj, bindForObject(obj, binds), { row: rows[0]!, n: 1, setPhotos });
  }

  for (let i = 1; i < rows.length; i++) {
    for (const obj of members) {
      const clone = await obj.clone(CLONE_PROPS);
      clone.set({ top: (obj.top ?? 0) + i * step });
      clone.setCoords();
      await applyBinding(clone, bindForObject(obj, binds), {
        row: rows[i]!,
        n: i + 1,
        setPhotos,
      });
      canvas.add(clone);
    }
  }
}

/** Render one page of one set into an offscreen StaticCanvas. */
export async function renderPageCanvas(
  width: number,
  height: number,
  scene: FabricScene,
  groups: DataGroupDef[],
  gen: GeneratedPage,
  setPhotos: string[],
  binds: Map<string, string>,
): Promise<fabric.StaticCanvas> {
  const groupIds = groupMemberIdSet(groups);
  const canvas = new fabric.StaticCanvas(undefined, {
    width,
    height,
    renderOnAddRemove: false,
  });
  const { dataGroups: _dg, ...canvasJson } = scene;
  void _dg;
  await canvas.loadFromJSON(canvasJson);
  canvas.setDimensions({ width, height });

  const fillByGroup = new Map(gen.groups.map((g) => [g.groupId, g.rows]));

  // Static objects (not part of any data group).
  for (const obj of canvas.getObjects()) {
    if (groupIds.has(getId(obj))) continue;
    await applyBinding(obj, bindForObject(obj, binds), { setPhotos });
  }

  for (const g of groups) {
    const rows = fillByGroup.get(g.id);
    if (!rows || !rows.length) continue;
    if (g.mode === "slot") {
      await bindSlotGroup(canvas, g, binds, rows[0]!, setPhotos);
    } else {
      await bindRepeatGroup(canvas, g, binds, rows, setPhotos);
    }
  }

  canvas.renderAll();
  return canvas;
}

export function canvasToJpegBytes(canvas: fabric.StaticCanvas, quality = 0.9): Uint8Array {
  const dataUrl = canvas.toDataURL({
    format: "jpeg",
    quality,
    multiplier: 1,
    enableRetinaScaling: false,
  });
  return dataUrlToBytes(dataUrl);
}

export function canvasToPngBytes(canvas: fabric.StaticCanvas): Uint8Array {
  const dataUrl = canvas.toDataURL({ format: "png", multiplier: 1, enableRetinaScaling: false });
  return dataUrlToBytes(dataUrl);
}

export interface RenderProgress {
  onProgress?: (done: number, total: number, file: string) => void;
}

/** Render every set×page to in-memory images and return zip bytes. */
export async function renderSetsToZip(
  set: TemplateSet,
  payload: GeneratePayload,
  recipe: Recipe,
  opts: RenderProgress = {},
): Promise<{ zipBytes: Uint8Array; fileCount: number }> {
  await ensureFonts();

  const plan = buildKhuonPlan(set);
  const pageById = new Map(plan.pages.map((p) => [p.pageId, p]));
  const binds = bindMap(recipe.bindings);

  const ext = recipe.output.format === "png" ? "png" : "jpg";
  const q = Math.min(1, Math.max(0.1, (recipe.output.quality ?? 90) / 100));

  const files: Record<string, Uint8Array> = {};
  const total = payload.sets.reduce((sum, s) => sum + s.pages.length, 0);
  let done = 0;

  for (const gset of payload.sets) {
    const folder = `bo${String(gset.setIndex).padStart(2, "0")}`;
    for (let pi = 0; pi < gset.pages.length; pi++) {
      const gpage = gset.pages[pi]!;
      const pp = pageById.get(gpage.pageId);
      if (!pp) continue;
      const canvas = await renderPageCanvas(
        set.width,
        set.height,
        pp.scene,
        pp.groups,
        gpage,
        gset.setPhotos,
        binds,
      );
      const bytes =
        ext === "png" ? canvasToPngBytes(canvas) : canvasToJpegBytes(canvas, q);
      const nameInZip = `${folder}/anh${String(pi + 1).padStart(2, "0")}.${ext}`;
      files[nameInZip] = bytes;
      canvas.dispose();
      done++;
      opts.onProgress?.(done, total, nameInZip);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return { zipBytes: makeZip(files), fileCount: done };
}
```

- [ ] **Step 2: Typecheck (còn đỏ ở recipe-io/produce)**

Run: `pnpm --filter @genposter/desktop typecheck`
Expected: FAIL nhưng KHÔNG còn lỗi trong `render.ts`, `bind.ts`, `ai.ts`, `generate.ts`, `khuon-plan.ts`. Lỗi còn lại tập trung ở `recipe-io.ts`, `template-io.ts`, `features/produce/*`.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/lib/render.ts
git commit -m "feat(produce): render pages per set and zip in memory"
```

---

## Task 8: `recipe-io.ts` + xoá `template-io.ts`

**Files:**
- Modify: `apps/desktop/src/lib/recipe-io.ts`
- Delete: `apps/desktop/src/lib/template-io.ts`

- [ ] **Step 1: Viết lại `recipe-io.ts`**

Thay toàn bộ `apps/desktop/src/lib/recipe-io.ts`:

```ts
import yaml from "js-yaml";
import type { Recipe } from "@genposter/schema";

import { ensureDir, exists, readDir, readText, writeText } from "./fsx.js";
import { join, paths, slugify } from "./paths.js";

export interface RecipeSummary {
  id: string;
  name: string;
  templateId: string;
  sheet: string;
}

/** YAML on-disk shape (snake_case, human friendly). */
interface RecipeYaml {
  name?: string;
  template_id?: string;
  data?: {
    sheet?: string;
    filter?: Record<string, string>;
    limit?: number | null;
  };
  photos?: { per_item?: number; per_set?: number };
  random_set_count?: number;
  bindings?: { elementId: string; bind: string; label?: string }[];
  output?: { dir?: string; format?: "jpg" | "png"; quality?: number };
}

function yamlToRecipe(y: RecipeYaml, id: string): Recipe {
  return {
    id,
    name: y.name ?? id,
    templateId: y.template_id ?? "",
    data: {
      sheet: y.data?.sheet ?? "",
      filter: y.data?.filter ?? {},
      limit: y.data?.limit ?? null,
    },
    photos: {
      perItem: y.photos?.per_item ?? 1,
      perSet: y.photos?.per_set ?? 0,
    },
    randomSetCount: y.random_set_count ?? 1,
    bindings: (y.bindings ?? []).map((b) => ({
      elementId: b.elementId,
      bind: b.bind,
      label: b.label,
    })),
    output: {
      dir: y.output?.dir ?? `output/${id}`,
      format: y.output?.format ?? "jpg",
      quality: y.output?.quality ?? 90,
    },
  };
}

function recipeToYaml(r: Recipe): RecipeYaml {
  return {
    name: r.name,
    template_id: r.templateId,
    data: {
      sheet: r.data.sheet,
      filter: Object.keys(r.data.filter).length ? r.data.filter : undefined,
      limit: r.data.limit ?? undefined,
    },
    photos: { per_item: r.photos.perItem, per_set: r.photos.perSet },
    random_set_count: r.randomSetCount,
    bindings: r.bindings.filter((b) => b.elementId && b.bind),
    output: r.output,
  };
}

export async function listRecipes(): Promise<RecipeSummary[]> {
  const dir = paths.recipesDir();
  if (!(await exists(dir))) return [];
  const entries = await readDir(dir);
  const out: RecipeSummary[] = [];
  for (const e of entries) {
    if (!e.isFile || !e.name.endsWith(".yaml")) continue;
    try {
      const y = yaml.load(await readText(join(dir, e.name))) as RecipeYaml;
      const id = e.name.replace(/\.yaml$/, "");
      out.push({
        id,
        name: y?.name ?? id,
        templateId: y?.template_id ?? "",
        sheet: y?.data?.sheet ?? "",
      });
    } catch {
      // skip invalid
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export async function loadRecipe(id: string): Promise<Recipe> {
  const y = yaml.load(await readText(paths.recipe(id))) as RecipeYaml;
  return yamlToRecipe(y ?? {}, id);
}

export async function saveRecipe(recipe: Recipe): Promise<string> {
  const id = slugify(recipe.id || recipe.name);
  await ensureDir(paths.recipesDir());
  const text = yaml.dump(recipeToYaml({ ...recipe, id }), {
    lineWidth: 120,
    noRefs: true,
  });
  await writeText(paths.recipe(id), text);
  return id;
}
```

- [ ] **Step 2: Xoá `template-io.ts`**

```bash
git rm apps/desktop/src/lib/template-io.ts
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/lib/recipe-io.ts
git commit -m "feat(produce): recipe yaml for khuon shape, drop template-io flattening"
```

---

## Task 9: Produce utils — `elements.ts`, `preset-utils.ts`, `options.ts`

**Files:**
- Modify: `apps/desktop/src/features/produce/elements.ts`
- Modify: `apps/desktop/src/features/produce/preset-utils.ts`
- Modify: `apps/desktop/src/features/produce/options.ts`

- [ ] **Step 1: Viết lại `elements.ts`**

Thay toàn bộ `apps/desktop/src/features/produce/elements.ts`:

```ts
import type { DataGroupDef, FabricScene, TemplateSet } from "@genposter/schema";

import { migrateSceneDataGroups } from "../../lib/scene-groups.js";

export interface ElementInfo {
  id: string;
  type: string;
  label: string;
  bindHint: string;
  dataGroupId: string;
  isImage: boolean;
}

export interface PageElements {
  pageId: string;
  name: string;
  elements: ElementInfo[];
  dataGroups: DataGroupDef[];
}

/** Pull bindable objects (those with a stable id) out of a single scene. */
export function extractElements(scene: FabricScene | undefined): ElementInfo[] {
  const objs = (scene?.objects ?? []) as Record<string, unknown>[];
  const out: ElementInfo[] = [];
  for (const o of objs) {
    const id = typeof o.id === "string" ? o.id : "";
    if (!id) continue;
    const type = typeof o.type === "string" ? o.type : "obj";
    out.push({
      id,
      type,
      label: (o.gpLabel as string) || type,
      bindHint: (o.gpBind as string) || "",
      dataGroupId: (o.gpDataGroup as string) || "",
      isImage: type === "image",
    });
  }
  return out;
}

/** Per-page elements + data groups for the whole khuôn (migrated scenes). */
export function extractSetPages(set: TemplateSet): PageElements[] {
  return set.pages.map((p, i) => {
    const scene = migrateSceneDataGroups(p.scene);
    return {
      pageId: p.id,
      name: p.name ?? `Trang ${i + 1}`,
      elements: extractElements(scene),
      dataGroups: (scene.dataGroups as DataGroupDef[] | undefined) ?? [],
    };
  });
}

export function allElements(pages: PageElements[]): ElementInfo[] {
  return pages.flatMap((p) => p.elements);
}
```

- [ ] **Step 2: Viết lại `preset-utils.ts`**

Thay toàn bộ `apps/desktop/src/features/produce/preset-utils.ts`:

```ts
import type { Recipe } from "@genposter/schema";

import { slugify } from "../../lib/paths.js";
import type { ElementInfo } from "./elements.js";

/** Flat, form-friendly representation of a recipe used by the Produce UI. */
export interface Draft {
  id: string;
  name: string;
  templateId: string; // TemplateSet id
  sheet: string;
  filterField: string;
  filterValue: string;
  limit: string;
  perItem: number;
  perSet: number;
  randomSetCount: number;
  /** elementId -> binding token */
  bindings: Record<string, string>;
  outDir: string;
  format: "jpg" | "png";
  quality: number;
}

export function emptyDraft(templateId = ""): Draft {
  return {
    id: "",
    name: "Khuôn mới",
    templateId,
    sheet: "",
    filterField: "",
    filterValue: "",
    limit: "",
    perItem: 1,
    perSet: 0,
    randomSetCount: 5,
    bindings: {},
    outDir: "",
    format: "jpg",
    quality: 90,
  };
}

/** Prefill bindings from element design hints (without overwriting). */
export function mergeElements(draft: Draft, elements: ElementInfo[]): Draft {
  const bindings = { ...draft.bindings };
  for (const el of elements) {
    if (bindings[el.id] === undefined && el.bindHint) bindings[el.id] = el.bindHint;
  }
  const valid = new Set(elements.map((e) => e.id));
  for (const id of Object.keys(bindings)) if (!valid.has(id)) delete bindings[id];
  return { ...draft, bindings };
}

export function draftToRecipe(d: Draft, elements: ElementInfo[]): Recipe {
  const labelById = new Map(elements.map((e) => [e.id, e.label]));
  const bindings = Object.entries(d.bindings)
    .filter(([, bind]) => bind)
    .map(([elementId, bind]) => ({
      elementId,
      bind,
      label: labelById.get(elementId),
    }));

  const filter =
    d.filterField && d.filterValue ? { [d.filterField]: d.filterValue } : {};

  const id = slugify(d.id || d.name);
  return {
    id,
    name: d.name,
    templateId: d.templateId,
    data: {
      sheet: d.sheet,
      filter,
      limit: d.limit ? Number(d.limit) : null,
    },
    photos: { perItem: d.perItem, perSet: d.perSet },
    randomSetCount: d.randomSetCount,
    bindings,
    output: {
      dir: d.outDir || `output/${id}`,
      format: d.format,
      quality: d.quality,
    },
  };
}

export function recipeToDraft(r: Recipe): Draft {
  const filterKeys = Object.keys(r.data.filter ?? {});
  const bindings: Record<string, string> = {};
  for (const b of r.bindings) bindings[b.elementId] = b.bind;
  return {
    id: r.id,
    name: r.name,
    templateId: r.templateId,
    sheet: r.data.sheet,
    filterField: filterKeys[0] ?? "",
    filterValue: filterKeys[0] ? r.data.filter[filterKeys[0]]! : "",
    limit: r.data.limit != null ? String(r.data.limit) : "",
    perItem: r.photos.perItem,
    perSet: r.photos.perSet,
    randomSetCount: r.randomSetCount,
    bindings,
    outDir: r.output.dir,
    format: r.output.format,
    quality: r.output.quality,
  };
}
```

- [ ] **Step 3: Viết lại `options.ts`**

Thay toàn bộ `apps/desktop/src/features/produce/options.ts`:

```ts
import { FIELD_LABELS } from "@genposter/schema";

export interface BindOption {
  value: string;
  label: string;
}

/** Build the dropdown options for a binding cell, depending on element kind. */
export function buildBindOptions(fields: string[], isImage: boolean): BindOption[] {
  const out: BindOption[] = [{ value: "", label: "— Không gán —" }];

  if (isImage) {
    out.push({ value: "photo:item:0", label: "Ảnh mục #1" });
    out.push({ value: "photo:item:1", label: "Ảnh mục #2" });
    out.push({ value: "photo:item:2", label: "Ảnh mục #3" });
    out.push({ value: "photo:set:0", label: "Ảnh bộ #1" });
    out.push({ value: "photo:set:1", label: "Ảnh bộ #2" });
    return out;
  }

  out.push({ value: "n", label: "STT (số thứ tự)" });
  for (const f of fields) {
    out.push({ value: `item.${f}`, label: `Mục: ${FIELD_LABELS[f] ?? f}` });
  }
  out.push({ value: "static:", label: "Văn bản cố định…" });
  out.push({ value: "ai:", label: "AI sinh chữ…" });
  return out;
}

/** Which editing affordance a binding value needs. */
export function bindKind(bind: string): "plain" | "static" | "ai" {
  if (bind.startsWith("static:")) return "static";
  if (bind.startsWith("ai:")) return "ai";
  return "plain";
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/features/produce/elements.ts apps/desktop/src/features/produce/preset-utils.ts apps/desktop/src/features/produce/options.ts
git commit -m "feat(produce): per-page elements, khuon draft, set photo options"
```

---

## Task 10: `ProduceBindingsPanel.tsx` — bảng gán cho 1 trang

**Files:**
- Modify: `apps/desktop/src/features/produce/ProduceBindingsPanel.tsx`

- [ ] **Step 1: Sửa props + bỏ ô itemIndex**

Trong `ProduceBindingsPanel.tsx`:

1. Trong phần import `@mantine/core`, bỏ `NumberInput` khỏi danh sách (không còn dùng).
2. Bỏ khối `{g.mode === "slot" && ( <NumberInput ... disabled /> )}` trong `Accordion.Panel` (ô "Item trên slide" — không còn ý nghĩa khi random-fill).
3. Đổi câu chú thích trong `Group` của nhóm từ:

```tsx
                        <Text size="xs" c="dimmed">
                          Các phần tử trong nhóm dùng chung 1 item khi tạo ảnh.
                        </Text>
```

thành:

```tsx
                        <Text size="xs" c="dimmed">
                          Nhóm slot lấy 1 dòng ngẫu nhiên; nhóm lặp lấy nhiều dòng.
                        </Text>
```

(Giữ nguyên phần còn lại: `BindingRow`, bảng nhóm, bảng đối tượng lẻ, copy/paste binding, props `draft/setD/elements/dataGroups/canonFields`.)

- [ ] **Step 2: Typecheck riêng file**

Run: `pnpm --filter @genposter/desktop typecheck`
Expected: `ProduceBindingsPanel.tsx` không còn lỗi (còn lỗi ở `ProduceTab.tsx` — task sau).

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/features/produce/ProduceBindingsPanel.tsx
git commit -m "feat(produce): bindings panel drops slot itemIndex"
```

---

## Task 11: `ProduceTab.tsx` — layout mới + Sinh & Xuất

**Files:**
- Modify: `apps/desktop/src/features/produce/ProduceTab.tsx`

- [ ] **Step 1: Viết lại `ProduceTab.tsx`**

Thay toàn bộ `apps/desktop/src/features/produce/ProduceTab.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import { open as openPath } from "@tauri-apps/plugin-shell";
import { save } from "@tauri-apps/plugin-dialog";
import {
  Accordion,
  Alert,
  Box,
  Button,
  Card,
  Group,
  NumberInput,
  Progress,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconDeviceFloppy,
  IconDownload,
  IconFilePlus,
  IconFolderOpen,
} from "@tabler/icons-react";
import type { TemplateSet } from "@genposter/schema";

import { buildGenerate } from "../../lib/generate.js";
import { sheetColumns, listSheets, type SheetInfo } from "../../lib/excel.js";
import { loadMapping } from "../../lib/mapping.js";
import { renderSetsToZip } from "../../lib/render.js";
import {
  listRecipes,
  loadRecipe,
  saveRecipe,
  type RecipeSummary,
} from "../../lib/recipe-io.js";
import {
  listTemplateSets,
  loadTemplateSet,
  type TemplateSetSummary,
} from "../../lib/templateset-io.js";
import { ensureDir, writeBytes } from "../../lib/fsx.js";
import { join, paths } from "../../lib/paths.js";
import { buildKhuonPlan } from "../../lib/khuon-plan.js";
import { timestampZipName } from "../../lib/zip.js";
import { allElements, extractSetPages, type PageElements } from "./elements.js";
import { ProduceBindingsPanel } from "./ProduceBindingsPanel.js";
import {
  draftToRecipe,
  emptyDraft,
  mergeElements,
  recipeToDraft,
  type Draft,
} from "./preset-utils.js";
import "./produce.css";

const ok = (message: string) => notifications.show({ message, color: "teal" });
const fail = (message: string) => notifications.show({ message, color: "red" });

export function ProduceTab() {
  const [sets, setSets] = useState<TemplateSetSummary[]>([]);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [canonFields, setCanonFields] = useState<string[]>([]);

  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [pages, setPages] = useState<PageElements[]>([]);
  const [templateSet, setTemplateSet] = useState<TemplateSet | null>(null);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ dest: string; summaries: string[] } | null>(null);
  const [dataErr, setDataErr] = useState<string | null>(null);

  const setD = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => {
    void (async () => {
      try {
        setSets(await listTemplateSets());
        setRecipes(await listRecipes());
      } catch (e) {
        fail(`Không đọc được mẫu/khuôn: ${String(e)}`);
      }
      try {
        setSheets(await listSheets());
        setDataErr(null);
      } catch (e) {
        setDataErr(
          `Không đọc được Excel. Hãy đặt file vào data/database/ và kiểm tra mapping.yaml. (${String(e)})`,
        );
      }
    })();
  }, []);

  const rowsNeededPerSet = useMemo(
    () => (templateSet ? buildKhuonPlan(templateSet).rowsNeededPerSet : 0),
    [templateSet],
  );

  const candidateCount = useMemo(() => {
    const s = sheets.find((x) => x.sheet === draft.sheet);
    const total = s?.rows ?? 0;
    const limit = draft.limit ? Number(draft.limit) : 0;
    return limit > 0 ? Math.min(limit, total) : total;
  }, [sheets, draft.sheet, draft.limit]);

  const notEnough = rowsNeededPerSet > 0 && candidateCount < rowsNeededPerSet;

  async function chooseSet(id: string, base?: Draft) {
    if (!id) {
      setTemplateSet(null);
      setPages([]);
      return;
    }
    try {
      const set = await loadTemplateSet(id);
      const pe = extractSetPages(set);
      setTemplateSet(set);
      setPages(pe);
      setDraft((d) => mergeElements({ ...(base ?? d), templateId: id }, allElements(pe)));
    } catch (e) {
      fail(`Lỗi tải mẫu: ${String(e)}`);
    }
  }

  async function chooseSheet(sheet: string) {
    setD({ sheet });
    if (!sheet) {
      setColumns([]);
      setCanonFields([]);
      return;
    }
    try {
      setColumns(await sheetColumns(sheet));
      const m = await loadMapping();
      setCanonFields(Object.keys(m.sheets[sheet]?.fields ?? {}));
    } catch (e) {
      fail(`Lỗi đọc cột sheet: ${String(e)}`);
    }
  }

  async function chooseRecipe(id: string) {
    if (!id) {
      setDraft(emptyDraft(draft.templateId));
      return;
    }
    try {
      const r = await loadRecipe(id);
      const d = recipeToDraft(r);
      await chooseSet(r.templateId, d);
      await chooseSheet(r.data.sheet);
      setDraft(d);
      ok(`Đã mở khuôn: ${r.name}`);
    } catch (e) {
      fail(`Lỗi mở khuôn: ${String(e)}`);
    }
  }

  async function savePreset() {
    try {
      const recipe = draftToRecipe(draft, allElements(pages));
      const id = await saveRecipe(recipe);
      setRecipes(await listRecipes());
      setD({ id });
      ok(`Đã lưu khuôn: ${id}`);
    } catch (e) {
      fail(`Lỗi lưu khuôn: ${String(e)}`);
    }
  }

  async function generateAndExport() {
    if (!templateSet) return;
    setBusy(true);
    setResult(null);
    setProgress({ done: 0, total: 0 });
    try {
      const recipe = draftToRecipe(draft, allElements(pages));
      const payload = await buildGenerate(templateSet, recipe);
      const { zipBytes, fileCount } = await renderSetsToZip(templateSet, payload, recipe, {
        onProgress: (done, total) => setProgress({ done, total }),
      });
      await ensureDir(paths.outputDir());
      const dest = await save({
        defaultPath: join(paths.outputDir(), timestampZipName()),
        filters: [{ name: "Zip", extensions: ["zip"] }],
      });
      if (!dest) {
        ok("Đã hủy lưu.");
        return;
      }
      await writeBytes(dest, zipBytes);
      const summaries = payload.sets.map((s) => {
        const names = [
          ...new Set(
            s.pages.flatMap((p) =>
              p.groups.flatMap((g) => g.rows.map((r) => String(r.name ?? ""))),
            ),
          ),
        ]
          .filter(Boolean)
          .slice(0, 3);
        return `Bộ ${s.setIndex}: ${names.join(", ") || "(ảnh tĩnh)"}`;
      });
      setResult({ dest, summaries });
      ok(`Đã xuất ${payload.sets.length} bộ (${fileCount} ảnh).`);
    } catch (e) {
      fail(`Lỗi sinh ảnh: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const percent = progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  return (
    <div className="produce">
      <Group className="produce-head" gap="md" align="flex-end" wrap="wrap">
        <Box mr="auto">
          <Title order={3}>Tạo ảnh</Title>
          <Text c="dimmed" size="sm">
            Chọn bộ khuôn, gán dữ liệu theo trang, sinh nhiều bộ ngẫu nhiên
          </Text>
        </Box>
        <Select
          label="Bộ mẫu"
          placeholder="— Chọn bộ —"
          w={210}
          clearable
          value={draft.templateId || null}
          data={sets.map((t) => ({ value: t.id, label: t.name }))}
          onChange={(v) => void chooseSet(v ?? "")}
        />
        <Select
          label="Khuôn"
          placeholder="— Khuôn mới —"
          w={210}
          clearable
          value={draft.id || null}
          data={recipes.map((r) => ({ value: r.id, label: r.name }))}
          onChange={(v) => void chooseRecipe(v ?? "")}
        />
        <Button
          variant="default"
          leftSection={<IconFilePlus size={18} />}
          onClick={() => setDraft(emptyDraft(draft.templateId))}
        >
          Khuôn mới
        </Button>
        <Button leftSection={<IconDeviceFloppy size={18} />} onClick={() => void savePreset()}>
          Lưu khuôn
        </Button>
      </Group>

      {dataErr && (
        <Alert icon={<IconAlertTriangle size={18} />} color="red" title="Chưa đọc được dữ liệu" m="md">
          {dataErr}
        </Alert>
      )}

      <div className="produce-body">
        <Card withBorder radius="lg" padding="lg">
          <Title order={5} mb="sm">
            Nguồn dữ liệu
          </Title>
          <Stack gap="sm">
            <TextInput
              label="Tên khuôn"
              value={draft.name}
              onChange={(e) => setD({ name: e.currentTarget.value })}
            />
            <SimpleGrid cols={2} spacing="sm">
              <Select
                label="Sheet"
                placeholder="— Chọn sheet —"
                value={draft.sheet || null}
                data={sheets.map((s) => ({ value: s.sheet, label: `${s.label} (${s.rows})` }))}
                onChange={(v) => void chooseSheet(v ?? "")}
              />
              <Select
                label="Lọc theo cột"
                placeholder="— Không lọc —"
                clearable
                value={draft.filterField || null}
                data={columns}
                onChange={(v) => setD({ filterField: v ?? "" })}
              />
              <TextInput
                label="Giá trị lọc"
                placeholder="vd: An Toi"
                value={draft.filterValue}
                onChange={(e) => setD({ filterValue: e.currentTarget.value })}
              />
              <NumberInput
                label="Giới hạn dòng (trống = tất cả)"
                min={0}
                value={draft.limit === "" ? "" : Number(draft.limit)}
                onChange={(v) => setD({ limit: v === "" || v == null ? "" : String(v) })}
              />
              <NumberInput
                label="Ảnh / mục"
                min={0}
                value={draft.perItem}
                onChange={(v) => setD({ perItem: typeof v === "number" ? v : 0 })}
              />
              <NumberInput
                label="Ảnh / bộ"
                min={0}
                value={draft.perSet}
                onChange={(v) => setD({ perSet: typeof v === "number" ? v : 0 })}
              />
            </SimpleGrid>
          </Stack>
        </Card>

        <Card withBorder radius="lg" padding="lg">
          <Title order={5} mb="sm">
            Số lượng & Xuất
          </Title>
          <Stack gap="sm">
            <NumberInput
              label="Số bộ muốn sinh"
              min={1}
              value={draft.randomSetCount}
              onChange={(v) => setD({ randomSetCount: typeof v === "number" ? v : 1 })}
            />
            <Text size="xs" c={notEnough ? "red" : "dimmed"}>
              Mỗi bộ cần {rowsNeededPerSet} dòng dữ liệu · có {candidateCount} dòng sau lọc
              {notEnough ? " — không đủ!" : ""}
            </Text>
            <SimpleGrid cols={2} spacing="sm">
              <Box>
                <Text size="sm" fw={500} mb={4}>
                  Định dạng
                </Text>
                <SegmentedControl
                  fullWidth
                  value={draft.format}
                  onChange={(v) => setD({ format: v as "jpg" | "png" })}
                  data={[
                    { value: "jpg", label: "JPG" },
                    { value: "png", label: "PNG" },
                  ]}
                />
              </Box>
              <NumberInput
                label="Chất lượng"
                min={10}
                max={100}
                value={draft.quality}
                onChange={(v) => setD({ quality: typeof v === "number" ? v : 90 })}
              />
            </SimpleGrid>
          </Stack>
        </Card>

        <Card withBorder radius="lg" padding="lg" className="full">
          <Title order={5} mb="sm">
            Gán dữ liệu theo trang
          </Title>
          {pages.length === 0 ? (
            <Text c="dimmed" size="sm">
              Chọn một bộ mẫu để hiển thị các trang.
            </Text>
          ) : (
            <Accordion variant="separated" radius="md" multiple defaultValue={pages.map((p) => p.pageId)}>
              {pages.map((p) => (
                <Accordion.Item key={p.pageId} value={p.pageId}>
                  <Accordion.Control>
                    <Text fw={600} size="sm">
                      {p.name}
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    {p.elements.length === 0 ? (
                      <Text c="dimmed" size="sm">
                        Trang này không có đối tượng gán được.
                      </Text>
                    ) : (
                      <ProduceBindingsPanel
                        draft={draft}
                        setD={setD}
                        elements={p.elements}
                        dataGroups={p.dataGroups}
                        canonFields={canonFields}
                      />
                    )}
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </Card>

        {result && (
          <Card withBorder radius="lg" padding="lg" className="full">
            <Group justify="space-between" mb="sm">
              <Title order={5}>Kết quả ({result.summaries.length} bộ)</Title>
              <Button
                variant="light"
                leftSection={<IconFolderOpen size={18} />}
                onClick={() => void openPath(result.dest.replace(/[\\/][^\\/]*$/, ""))}
              >
                Mở thư mục
              </Button>
            </Group>
            <Stack gap={2}>
              {result.summaries.map((s, i) => (
                <Text key={i} size="xs" c="dimmed">
                  {s}
                </Text>
              ))}
            </Stack>
          </Card>
        )}
      </div>

      <Group className="produce-actions" gap="md">
        <Button
          leftSection={<IconDownload size={18} />}
          onClick={() => void generateAndExport()}
          disabled={busy || !templateSet || !draft.sheet || notEnough}
          loading={busy}
        >
          Sinh & Xuất
        </Button>
        {progress.total > 0 && (
          <Box style={{ flex: 1 }}>
            <Progress value={percent} animated={busy} />
          </Box>
        )}
        {progress.total > 0 && (
          <Text c="dimmed" size="sm">
            {progress.done}/{progress.total}
          </Text>
        )}
      </Group>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck toàn bộ**

Run: `pnpm --filter @genposter/desktop typecheck`
Expected: PASS (không còn lỗi).

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/features/produce/ProduceTab.tsx
git commit -m "feat(produce): khuon UI with per-page bindings and Sinh & Xuất"
```

---

## Task 12: Kiểm thử toàn bộ + kiểm thử thủ công

**Files:** (không sửa code trừ khi phát hiện lỗi)

- [ ] **Step 1: Chạy toàn bộ test**

Run: `pnpm --filter @genposter/desktop test`
Expected: PASS tất cả (bao gồm `bind`, `khuon-plan`, `zip`, và các test cũ `font-catalog`, `templateset-util`).

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @genposter/desktop typecheck`
Expected: PASS.

- [ ] **Step 3: Kiểm thử thủ công (dev)**

Run: `pnpm --filter @genposter/desktop dev` (nếu chưa chạy), rồi kiểm theo checklist:
1. Chọn bộ mẫu nhiều trang → các trang hiện thành Accordion; mỗi trang có bảng nhóm + đối tượng lẻ.
2. Dòng "Mỗi bộ cần N dòng" đúng với tổng nhóm; lọc còn ít hơn N → chữ đỏ + nút "Sinh & Xuất" bị khóa.
3. Chọn sheet, gán vài field (text `item.name`, ảnh `photo:item:0`), nhập số bộ = 3.
4. Bấm "Sinh & Xuất" → hộp thoại lưu hiện tên `Genposter_YYYY-MM-DD_HH-MM.zip` → lưu.
5. Mở zip: có `bo01/ bo02/ bo03/`, mỗi thư mục đủ số ảnh = số trang; trong 1 bộ không dòng nào lặp.
6. Lưu khuôn → chọn lại từ dropdown "Khuôn" → binding/sheet/số bộ/perSet khôi phục đúng.
7. Khuôn không có nhóm dữ liệu → vẫn xuất được K bộ (ảnh tĩnh giống nhau), không lỗi.

- [ ] **Step 4: Commit (nếu có sửa lỗi phát sinh)**

```bash
git add -A
git commit -m "fix(produce): address issues found in manual QA"
```

(Nếu không có sửa gì thì bỏ qua step này.)

---

## Ghi chú thực thi

- Sau Task 2, typecheck sẽ đỏ cho tới hết Task 11 — điều này đã tính trước, cứ theo thứ tự task.
- Không thêm `title`/`subtitle`/`page`/`pages` token nữa; nếu cần đánh số bộ/trang trên poster sẽ mở task riêng.
- Zip nén trong RAM: K rất lớn có thể tốn bộ nhớ — chấp nhận trong đợt này (đã ghi ở spec mục 9).
