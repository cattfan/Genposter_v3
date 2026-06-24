# Trang tổng + Mẫu nhiều trang — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho tab Thiết kế một trang tổng quản lý nhiều "Mẫu", mỗi mẫu gồm nhiều trang chỉnh sửa được.

**Architecture:** Mô hình 3 cấp Trang tổng → `TemplateSet` (mẫu, 1 file JSON) → `TemplatePage` (trang = 1 scene Fabric). `DesignWorkspace` giữ `useEditor` + mẫu đang mở trong bộ nhớ, render `DesignHome` (trang tổng) hoặc `EditorTab` (luôn mounted để giữ canvas). Tab Tạo ảnh dùng lớp tương thích dàn phẳng trang.

**Tech Stack:** React 18, Mantine v7, Tabler Icons, Fabric.js v6, Tauri plugin-fs, vitest (cho hàm thuần), TypeScript.

**Spec:** `docs/superpowers/specs/2026-06-24-trang-tong-nhieu-trang-design.md`

**Lưu ý môi trường:** shell là PowerShell — nối lệnh bằng `;` (không dùng `&&`). Verify mỗi task bằng `pnpm --filter @genposter/desktop typecheck` + `build`; logic thuần có thêm `vitest`.

---

## File Structure

**Tạo mới**
- `apps/desktop/vitest.config.ts` — cấu hình test (node env, alias schema).
- `apps/desktop/src/lib/templateset-util.ts` — hàm thuần (ref, id, tên, di trú). Không import Tauri.
- `apps/desktop/src/lib/templateset-util.test.ts` — unit test cho util.
- `apps/desktop/src/lib/thumbnail.ts` — sinh ảnh xem trước trang.
- `apps/desktop/src/lib/templateset-io.ts` — CRUD mẫu trên đĩa.
- `apps/desktop/src/features/editor/PageStrip.tsx` — dải trang.
- `apps/desktop/src/features/editor/DesignHome.tsx` — trang tổng.
- `apps/desktop/src/features/editor/DesignWorkspace.tsx` — điều phối home/editor + state mẫu.

**Sửa**
- `packages/schema/src/index.ts` — thêm kiểu `TemplatePage`, `TemplateSet`, default size.
- `apps/desktop/src/lib/fsx.ts` — thêm `remove`.
- `apps/desktop/src/lib/template-io.ts` — chuyển thành lớp tương thích Tạo ảnh.
- `apps/desktop/src/features/editor/useEditor.ts` — kích thước canvas động + `setCanvasSize`.
- `apps/desktop/src/features/editor/EditorTab.tsx` — nhận mẫu/trang qua props (controlled), thêm dải trang.
- `apps/desktop/src/features/editor/Toolbar.tsx` — nút ← Trang tổng + tên mẫu + nhãn Trang.
- `apps/desktop/src/App.tsx` — tab Thiết kế render `DesignWorkspace`.
- `apps/desktop/src/features/editor/editor.css` — layout dải trang + trang tổng.
- `apps/desktop/package.json` — devDep `vitest` + script `test`.

---

## Task 1: Schema + hàm thuần + vitest (TDD)

**Files:**
- Modify: `packages/schema/src/index.ts`
- Modify: `apps/desktop/package.json`
- Create: `apps/desktop/vitest.config.ts`
- Create: `apps/desktop/src/lib/templateset-util.ts`
- Test: `apps/desktop/src/lib/templateset-util.test.ts`

- [ ] **Step 1: Thêm kiểu vào schema**

Trong `packages/schema/src/index.ts`, ngay sau `interface GenposterTemplate { ... }` (kết thúc dòng `}` của nó, trước phần `FabricScene`), chèn:

```ts
export interface TemplatePage {
  id: string;
  name?: string;
  scene: FabricScene;
  /** Small JPEG data URL preview, regenerated on save. */
  thumbnail?: string;
}

export interface TemplateSet {
  id: string;
  name: string;
  width: number;
  height: number;
  pages: TemplatePage[];
  createdAt?: string;
  updatedAt?: string;
}
```

Và ở cuối file, sau `export const BRAND_ORANGE = "#ff6600";`, thêm:

```ts
export const DEFAULT_TEMPLATE_W = 1588;
export const DEFAULT_TEMPLATE_H = 2248;
```

- [ ] **Step 2: Thêm vitest vào package.json**

Trong `apps/desktop/package.json`, thêm script `"test": "vitest run"` vào khối `scripts` (sau dòng `"typecheck": "tsc --noEmit",`), và thêm `"vitest": "^2.1.8"` vào `devDependencies` (giữ thứ tự bảng chữ cái không bắt buộc).

- [ ] **Step 3: Tạo `apps/desktop/vitest.config.ts`**

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const schemaSrc = fileURLToPath(
  new URL("../../packages/schema/src/index.ts", import.meta.url),
);

export default defineConfig({
  resolve: { alias: { "@genposter/schema": schemaSrc } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 4: Cài đặt**

Run: `pnpm install`
Expected: thêm `vitest`, exit 0.

- [ ] **Step 5: Viết test thất bại trước (`templateset-util.test.ts`)**

```ts
import { describe, expect, it } from "vitest";
import {
  makePageRef,
  parsePageRef,
  nextUntitledName,
  normalizeSet,
} from "./templateset-util.js";

describe("page ref", () => {
  it("round-trips set/page", () => {
    expect(parsePageRef(makePageRef("mau1", "p2"))).toEqual({
      setId: "mau1",
      pageId: "p2",
    });
  });
  it("legacy ref without separator yields null pageId", () => {
    expect(parsePageRef("oldid")).toEqual({ setId: "oldid", pageId: null });
  });
});

describe("nextUntitledName", () => {
  it("starts at 1", () => {
    expect(nextUntitledName([])).toBe("Mẫu mới (1)");
  });
  it("skips taken numbers", () => {
    expect(nextUntitledName(["Mẫu mới (1)", "Mẫu mới (2)"])).toBe("Mẫu mới (3)");
  });
});

describe("normalizeSet", () => {
  it("wraps a legacy single-scene template into one page", () => {
    const set = normalizeSet(
      { id: "a", name: "A", width: 1080, height: 1350, scene: { objects: [] } },
      "a",
    );
    expect(set.pages).toHaveLength(1);
    expect(set.pages[0]!.id).toBe("p1");
    expect(set.width).toBe(1080);
  });
  it("keeps an existing multi-page set", () => {
    const set = normalizeSet(
      {
        id: "b",
        name: "B",
        width: 1588,
        height: 2248,
        pages: [
          { id: "x", scene: { objects: [] } },
          { id: "y", scene: { objects: [] } },
        ],
      },
      "b",
    );
    expect(set.pages.map((p) => p.id)).toEqual(["x", "y"]);
  });
  it("falls back to defaults + fallbackId when fields missing", () => {
    const set = normalizeSet({ scene: { objects: [] } }, "fallback");
    expect(set.id).toBe("fallback");
    expect(set.width).toBe(1588);
    expect(set.height).toBe(2248);
  });
});
```

- [ ] **Step 6: Chạy test để chắc chắn FAIL**

Run: `pnpm --filter @genposter/desktop test`
Expected: FAIL — `Cannot find module './templateset-util.js'`.

- [ ] **Step 7: Viết `templateset-util.ts` tối thiểu để pass**

```ts
import {
  DEFAULT_TEMPLATE_H,
  DEFAULT_TEMPLATE_W,
  type FabricScene,
  type TemplatePage,
  type TemplateSet,
} from "@genposter/schema";

const SEP = "::";

export function makePageRef(setId: string, pageId: string): string {
  return `${setId}${SEP}${pageId}`;
}

export function parsePageRef(ref: string): { setId: string; pageId: string | null } {
  const i = ref.indexOf(SEP);
  if (i < 0) return { setId: ref, pageId: null };
  return { setId: ref.slice(0, i), pageId: ref.slice(i + SEP.length) };
}

export function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(
    Math.random() * 1e6,
  ).toString(36)}`;
}

export function emptyScene(): FabricScene {
  return { version: "6.0.0", objects: [] };
}

export function emptyPage(name?: string): TemplatePage {
  return { id: genId("page"), name, scene: emptyScene() };
}

export function nextUntitledName(existing: string[]): string {
  const taken = new Set(existing.map((s) => s.trim()));
  let n = 1;
  while (taken.has(`Mẫu mới (${n})`)) n++;
  return `Mẫu mới (${n})`;
}

export function normalizeSet(raw: unknown, fallbackId: string): TemplateSet {
  const o = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);
  const str = (v: unknown, d: string) => (typeof v === "string" ? v : d);

  if (Array.isArray(o.pages)) {
    return {
      id: str(o.id, fallbackId),
      name: str(o.name, fallbackId),
      width: num(o.width, DEFAULT_TEMPLATE_W),
      height: num(o.height, DEFAULT_TEMPLATE_H),
      pages: (o.pages as Record<string, unknown>[]).map((p, i) => ({
        id: str(p?.id, `p${i + 1}`),
        name: typeof p?.name === "string" ? (p.name as string) : undefined,
        scene: (p?.scene as FabricScene) ?? emptyScene(),
        thumbnail:
          typeof p?.thumbnail === "string" ? (p.thumbnail as string) : undefined,
      })),
      createdAt: typeof o.createdAt === "string" ? o.createdAt : undefined,
      updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : undefined,
    };
  }

  // Legacy single-scene template -> one page.
  return {
    id: str(o.id, fallbackId),
    name: str(o.name, fallbackId),
    width: num(o.width, DEFAULT_TEMPLATE_W),
    height: num(o.height, DEFAULT_TEMPLATE_H),
    pages: [
      {
        id: "p1",
        scene: (o.scene as FabricScene) ?? emptyScene(),
        thumbnail:
          typeof o.thumbnail === "string" ? (o.thumbnail as string) : undefined,
      },
    ],
    createdAt: typeof o.createdAt === "string" ? o.createdAt : undefined,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : undefined,
  };
}
```

- [ ] **Step 8: Chạy test để chắc chắn PASS**

Run: `pnpm --filter @genposter/desktop test`
Expected: PASS (4 file describe, tất cả xanh).

- [ ] **Step 9: Typecheck**

Run: `pnpm --filter @genposter/desktop typecheck`
Expected: exit 0.

- [ ] **Step 10: Commit**

```bash
git add packages/schema/src/index.ts apps/desktop/package.json apps/desktop/pnpm-lock.yaml pnpm-lock.yaml apps/desktop/vitest.config.ts apps/desktop/src/lib/templateset-util.ts apps/desktop/src/lib/templateset-util.test.ts
git commit -m "feat(schema): TemplateSet/TemplatePage + pure utils with vitest"
```

---

## Task 2: `thumbnail.ts` (ảnh xem trước trang)

**Files:**
- Create: `apps/desktop/src/lib/thumbnail.ts`

- [ ] **Step 1: Viết `thumbnail.ts`**

```ts
import * as fabric from "fabric";
import type { FabricScene } from "@genposter/schema";

import { ensureFonts } from "./fonts.js";

/** Render a small JPEG data URL preview of a page scene. */
export async function renderThumb(
  scene: FabricScene,
  width: number,
  height: number,
  maxW = 200,
): Promise<string> {
  await ensureFonts();
  const canvas = new fabric.StaticCanvas(undefined, {
    width,
    height,
    renderOnAddRemove: false,
  });
  try {
    await canvas.loadFromJSON(scene);
    canvas.setDimensions({ width, height });
    canvas.renderAll();
    const multiplier = Math.min(1, maxW / Math.max(1, width));
    return canvas.toDataURL({
      format: "jpeg",
      quality: 0.7,
      multiplier,
      enableRetinaScaling: false,
    });
  } finally {
    canvas.dispose();
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @genposter/desktop typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/lib/thumbnail.ts
git commit -m "feat(lib): page thumbnail renderer"
```

---

## Task 3: `fsx.remove` + `templateset-io.ts` (CRUD mẫu)

**Files:**
- Modify: `apps/desktop/src/lib/fsx.ts`
- Create: `apps/desktop/src/lib/templateset-io.ts`

- [ ] **Step 1: Thêm `remove` vào `fsx.ts`**

Sửa import đầu file để thêm `remove as fsRemove`:

```ts
import {
  exists as fsExists,
  mkdir,
  readDir as fsReadDir,
  readFile,
  readTextFile,
  remove as fsRemove,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
```

Thêm hàm (sau `writeBytes`):

```ts
export async function remove(path: string): Promise<void> {
  await fsRemove(path);
}
```

- [ ] **Step 2: Viết `templateset-io.ts`**

```ts
import type { TemplateSet } from "@genposter/schema";

import {
  ensureDir,
  exists,
  readDir,
  readText,
  remove,
  writeText,
} from "./fsx.js";
import { join, paths, slugify } from "./paths.js";
import { emptyPage, normalizeSet } from "./templateset-util.js";

export interface TemplateSetSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  updatedAt?: string;
  pages: { id: string; name?: string; thumbnail?: string }[];
}

function fileId(name: string): string {
  return name.replace(/\.json$/i, "");
}

async function existingIds(): Promise<Set<string>> {
  const dir = paths.templatesDir();
  if (!(await exists(dir))) return new Set();
  const entries = await readDir(dir);
  return new Set(
    entries
      .filter((e) => e.isFile && e.name.endsWith(".json"))
      .map((e) => fileId(e.name)),
  );
}

async function uniqueId(base: string): Promise<string> {
  const ids = await existingIds();
  const root = slugify(base);
  let id = root;
  let n = 2;
  while (ids.has(id)) id = `${root}-${n++}`;
  return id;
}

export async function listTemplateSets(): Promise<TemplateSetSummary[]> {
  const dir = paths.templatesDir();
  if (!(await exists(dir))) return [];
  const entries = await readDir(dir);
  const out: TemplateSetSummary[] = [];
  for (const e of entries) {
    if (!e.isFile || !e.name.endsWith(".json")) continue;
    try {
      const raw = JSON.parse(await readText(join(dir, e.name)));
      const set = normalizeSet(raw, fileId(e.name));
      out.push({
        id: set.id,
        name: set.name,
        width: set.width,
        height: set.height,
        updatedAt: set.updatedAt,
        pages: set.pages.map((p) => ({
          id: p.id,
          name: p.name,
          thumbnail: p.thumbnail,
        })),
      });
    } catch {
      // skip invalid file
    }
  }
  out.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  return out;
}

export async function loadTemplateSet(id: string): Promise<TemplateSet> {
  const raw = JSON.parse(await readText(paths.template(id)));
  return normalizeSet(raw, id);
}

export async function saveTemplateSet(set: TemplateSet): Promise<string> {
  const id = set.id || slugify(set.name);
  const toSave: TemplateSet = { ...set, id, updatedAt: new Date().toISOString() };
  await ensureDir(paths.templatesDir());
  await writeText(paths.template(id), JSON.stringify(toSave, null, 2));
  set.id = id;
  return id;
}

export async function createTemplateSet(
  name: string,
  width: number,
  height: number,
): Promise<TemplateSet> {
  const id = await uniqueId(name);
  const now = new Date().toISOString();
  const set: TemplateSet = {
    id,
    name,
    width,
    height,
    pages: [emptyPage()],
    createdAt: now,
    updatedAt: now,
  };
  await ensureDir(paths.templatesDir());
  await writeText(paths.template(id), JSON.stringify(set, null, 2));
  return set;
}

export async function duplicateTemplateSet(id: string): Promise<string> {
  const set = await loadTemplateSet(id);
  const newId = await uniqueId(`${set.name}-copy`);
  const now = new Date().toISOString();
  const copy: TemplateSet = {
    ...set,
    id: newId,
    name: `${set.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  };
  await writeText(paths.template(newId), JSON.stringify(copy, null, 2));
  return newId;
}

export async function renameTemplateSet(id: string, name: string): Promise<void> {
  const set = await loadTemplateSet(id);
  set.name = name;
  await saveTemplateSet(set);
}

export async function deleteTemplateSet(id: string): Promise<void> {
  await remove(paths.template(id));
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @genposter/desktop typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/lib/fsx.ts apps/desktop/src/lib/templateset-io.ts
git commit -m "feat(lib): templateset-io CRUD + fsx.remove"
```

---

## Task 4: Lớp tương thích Tạo ảnh (`template-io.ts`)

**Files:**
- Modify (ghi đè toàn bộ): `apps/desktop/src/lib/template-io.ts`

- [ ] **Step 1: Ghi đè `template-io.ts`**

```ts
import type { GenposterTemplate } from "@genposter/schema";

import { listTemplateSets, loadTemplateSet } from "./templateset-io.js";
import { makePageRef, parsePageRef } from "./templateset-util.js";

/** A flattened page entry the Produce tab can pick + render. */
export interface TemplateSummary {
  id: string; // "<setId>::<pageId>"
  name: string;
  width: number;
  height: number;
}

export async function listTemplates(): Promise<TemplateSummary[]> {
  const sets = await listTemplateSets();
  const out: TemplateSummary[] = [];
  for (const s of sets) {
    const n = s.pages.length;
    s.pages.forEach((p, k) => {
      out.push({
        id: makePageRef(s.id, p.id),
        name: `${s.name} · ${p.name ?? `Trang ${k + 1}`} (${k + 1}/${n})`,
        width: s.width,
        height: s.height,
      });
    });
  }
  return out;
}

export async function loadTemplate(ref: string): Promise<GenposterTemplate> {
  const { setId, pageId } = parsePageRef(ref);
  const set = await loadTemplateSet(setId);
  const page = (pageId ? set.pages.find((p) => p.id === pageId) : null) ?? set.pages[0]!;
  return {
    id: ref,
    name: set.name,
    width: set.width,
    height: set.height,
    scene: page.scene,
  };
}
```

- [ ] **Step 2: Typecheck (gồm ProduceTab dùng listTemplates/loadTemplate/TemplateSummary)**

Run: `pnpm --filter @genposter/desktop typecheck`
Expected: exit 0 (lưu ý: `saveTemplate` đã bị bỏ — Task 6 sẽ gỡ chỗ EditorTab dùng nó; nếu typecheck báo lỗi `saveTemplate` ở EditorTab, đó là dự kiến và sẽ hết sau Task 6. Có thể chạy lại typecheck sau Task 6).

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/lib/template-io.ts
git commit -m "feat(lib): produce-compat template-io flattening pages"
```

---

## Task 5: `useEditor` kích thước canvas động

**Files:**
- Modify: `apps/desktop/src/features/editor/useEditor.ts`

- [ ] **Step 1: Đổi import hằng số**

Sửa dòng import schema (đầu file) từ:

```ts
import { BRAND_ORANGE, CANVAS_H, CANVAS_W, type FabricScene } from "@genposter/schema";
```

thành:

```ts
import {
  BRAND_ORANGE,
  DEFAULT_TEMPLATE_H,
  DEFAULT_TEMPLATE_W,
  type FabricScene,
} from "@genposter/schema";
```

- [ ] **Step 2: Thêm `setCanvasSize` vào interface `EditorApi`**

Trong `interface EditorApi`, sau dòng `setZoom: (z: number) => void;` thêm:

```ts
  setCanvasSize: (w: number, h: number) => void;
```

- [ ] **Step 3: Thêm refs kích thước/zoom**

Ngay sau `const canvasRef = useRef<fabric.Canvas | null>(null);` thêm:

```ts
  const sizeRef = useRef({ w: DEFAULT_TEMPLATE_W, h: DEFAULT_TEMPLATE_H });
  const zoomRef = useRef(0.5);
```

- [ ] **Step 4: `applyZoom` dùng sizeRef + cập nhật zoomRef**

Thay nguyên hàm `applyZoom`:

```ts
  const applyZoom = useCallback((z: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const clamped = Math.min(4, Math.max(0.05, z));
    c.setZoom(clamped);
    c.setDimensions({
      width: sizeRef.current.w * clamped,
      height: sizeRef.current.h * clamped,
    });
    c.requestRenderAll();
    zoomRef.current = clamped;
    setZoomState(clamped);
  }, []);
```

- [ ] **Step 5: Init effect dùng sizeRef**

Trong `useEffect(() => { ... }, [])` khởi tạo canvas, thay 2 dòng:

```ts
    const canvas = new fabric.Canvas(el, {
      width: CANVAS_W,
      height: CANVAS_H,
```

thành:

```ts
    const canvas = new fabric.Canvas(el, {
      width: sizeRef.current.w,
      height: sizeRef.current.h,
```

- [ ] **Step 6: `add()` căn giữa theo sizeRef**

Trong `add`, thay:

```ts
      obj.set({
        left: (obj.left ?? 0) + CANVAS_W / 2 - (obj.getScaledWidth() || 0) / 2,
        top: (obj.top ?? 0) + CANVAS_H / 2 - (obj.getScaledHeight() || 0) / 2,
      });
```

thành:

```ts
      obj.set({
        left: (obj.left ?? 0) + sizeRef.current.w / 2 - (obj.getScaledWidth() || 0) / 2,
        top: (obj.top ?? 0) + sizeRef.current.h / 2 - (obj.getScaledHeight() || 0) / 2,
      });
```

- [ ] **Step 7: `align` dùng sizeRef**

Trong `align`, thay 4 chỗ dùng `CANVAS_W`/`CANVAS_H`:

```ts
          case "center-h":
            o.set({ left: (sizeRef.current.w - br.width) / 2 + dx });
            break;
          case "right":
            o.set({ left: sizeRef.current.w - br.width + dx });
            break;
```
```ts
          case "center-v":
            o.set({ top: (sizeRef.current.h - br.height) / 2 + dy });
            break;
          case "bottom":
            o.set({ top: sizeRef.current.h - br.height + dy });
            break;
```

- [ ] **Step 8: `setBackgroundImageDataUrl` scale theo sizeRef**

Thay dòng tính scale + set:

```ts
        const scale = Math.max(CANVAS_W / (img.width || 1), CANVAS_H / (img.height || 1));
```

thành:

```ts
        const scale = Math.max(
          sizeRef.current.w / (img.width || 1),
          sizeRef.current.h / (img.height || 1),
        );
```

- [ ] **Step 8b: `addImageDataUrl` dùng sizeRef**

Trong `addImageDataUrl`, thay:

```ts
      const maxW = CANVAS_W * 0.6;
```

thành:

```ts
      const maxW = sizeRef.current.w * 0.6;
```

(Đây là lần dùng `CANVAS_W`/`CANVAS_H` cuối cùng — sau bước này không còn tham chiếu nào tới hằng cũ, import đã đổi ở Step 1.)

- [ ] **Step 9: `fitTo` dùng sizeRef**

Thay thân `fitTo`:

```ts
  const fitTo = useCallback(
    (cw: number, ch: number) => {
      const z = Math.min(cw / sizeRef.current.w, ch / sizeRef.current.h);
      applyZoom(Math.max(0.05, z * 0.95));
    },
    [applyZoom],
  );
```

- [ ] **Step 10: Thêm `setCanvasSize` (đặt ngay sau `fitTo`)**

```ts
  const setCanvasSize = useCallback(
    (w: number, h: number) => {
      sizeRef.current = { w, h };
      applyZoom(zoomRef.current);
    },
    [applyZoom],
  );
```

- [ ] **Step 11: Export `setCanvasSize` trong return**

Trong object return, sau `setZoom: applyZoom,` thêm:

```ts
    setCanvasSize,
```

- [ ] **Step 12: Typecheck**

Run: `pnpm --filter @genposter/desktop typecheck`
Expected: exit 0 (trừ lỗi EditorTab còn dùng `saveTemplate`/`CANVAS_*` — sẽ sửa ở Task 6).

- [ ] **Step 13: Commit**

```bash
git add apps/desktop/src/features/editor/useEditor.ts
git commit -m "feat(editor): dynamic canvas size via setCanvasSize"
```

---

## Task 6: `PageStrip` + `Toolbar` + `EditorTab` (controlled)

**Files:**
- Create: `apps/desktop/src/features/editor/PageStrip.tsx`
- Modify (ghi đè): `apps/desktop/src/features/editor/Toolbar.tsx`
- Modify (ghi đè): `apps/desktop/src/features/editor/EditorTab.tsx`

- [ ] **Step 1: Tạo `PageStrip.tsx`**

```tsx
import { ActionIcon, Box, Group, Menu, ScrollArea, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconCopy, IconDotsVertical, IconPlus, IconTrash } from "@tabler/icons-react";
import type { TemplatePage } from "@genposter/schema";

export function PageStrip({
  pages,
  currentIndex,
  aspect,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onReorder,
}: {
  pages: TemplatePage[];
  currentIndex: number;
  aspect: number; // width / height
  onSelect: (i: number) => void;
  onAdd: () => void;
  onDuplicate: (i: number) => void;
  onDelete: (i: number) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const thumbH = 84;
  const thumbW = Math.max(40, Math.round(thumbH * (aspect || 0.7)));

  return (
    <div className="page-strip">
      <ScrollArea type="auto" scrollbars="x" offsetScrollbars>
        <Group gap="sm" wrap="nowrap" align="flex-start" p="xs">
          {pages.map((p, i) => (
            <Box
              key={p.id}
              pos="relative"
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const from = Number(e.dataTransfer.getData("text/plain"));
                if (!Number.isNaN(from) && from !== i) onReorder(from, i);
              }}
            >
              <UnstyledButton
                className="page-thumb"
                data-active={i === currentIndex || undefined}
                style={{ width: thumbW, height: thumbH }}
                onClick={() => onSelect(i)}
              >
                {p.thumbnail ? (
                  <img
                    src={p.thumbnail}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <Box w="100%" h="100%" bg="gray.1" />
                )}
              </UnstyledButton>
              <Text size="xs" ta="center" mt={2} c={i === currentIndex ? "riviu.7" : "dimmed"}>
                {i + 1}
              </Text>
              <Menu position="top-end" withinPortal>
                <Menu.Target>
                  <ActionIcon
                    variant="default"
                    size="xs"
                    pos="absolute"
                    style={{ top: 2, right: 2 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconDotsVertical size={12} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconCopy size={14} />} onClick={() => onDuplicate(i)}>
                    Nhân bản
                  </Menu.Item>
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    disabled={pages.length <= 1}
                    onClick={() => onDelete(i)}
                  >
                    Xoá
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Box>
          ))}
          <Tooltip label="Thêm trang">
            <UnstyledButton
              className="page-thumb add"
              style={{ width: thumbW, height: thumbH }}
              onClick={onAdd}
            >
              <IconPlus size={20} />
            </UnstyledButton>
          </Tooltip>
        </Group>
      </ScrollArea>
    </div>
  );
}
```

- [ ] **Step 2: Ghi đè `Toolbar.tsx`** (đổi nút file thành ← Trang tổng + tên mẫu + nhãn Trang)

```tsx
import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Group,
  Menu,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconArrowLeft,
  IconCircle,
  IconDeviceFloppy,
  IconHeading,
  IconLine,
  IconPhotoPlus,
  IconPhotoUp,
  IconPlus,
  IconSquare,
  IconTypography,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
} from "@tabler/icons-react";

import type { EditorApi } from "./useEditor.js";
import { pickImageDataUrl } from "./pickImage.js";

export function Toolbar({
  ed,
  name,
  onName,
  onBack,
  onSave,
  saving,
  pageLabel,
}: {
  ed: EditorApi;
  name: string;
  onName: (v: string) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
  pageLabel: string;
}) {
  return (
    <Group className="editor-toolbar" gap="xs" wrap="nowrap" h={56} px="sm">
      <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={18} />} onClick={onBack}>
        Trang tổng
      </Button>

      <TextInput
        value={name}
        onChange={(e) => onName(e.currentTarget.value)}
        placeholder="Tên mẫu…"
        w={200}
        variant="filled"
        styles={{ input: { fontWeight: 700 } }}
      />

      <Button leftSection={<IconDeviceFloppy size={18} />} loading={saving} onClick={onSave}>
        Lưu mẫu
      </Button>

      <Divider orientation="vertical" />

      <Menu shadow="md" position="bottom-start" width={210}>
        <Menu.Target>
          <Button variant="light" leftSection={<IconPlus size={18} />}>
            Thêm
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Văn bản</Menu.Label>
          <Menu.Item leftSection={<IconHeading size={16} />} onClick={() => ed.addText(true)}>
            Tiêu đề
          </Menu.Item>
          <Menu.Item leftSection={<IconTypography size={16} />} onClick={() => ed.addText(false)}>
            Văn bản
          </Menu.Item>
          <Menu.Label>Hình ảnh</Menu.Label>
          <Menu.Item
            leftSection={<IconPhotoUp size={16} />}
            onClick={async () => {
              const url = await pickImageDataUrl();
              if (url) await ed.addImageDataUrl(url);
            }}
          >
            Ảnh từ máy
          </Menu.Item>
          <Menu.Item leftSection={<IconPhotoPlus size={16} />} onClick={() => void ed.addImageSlot()}>
            Ô ảnh (theo dữ liệu)
          </Menu.Item>
          <Menu.Label>Hình khối</Menu.Label>
          <Menu.Item leftSection={<IconSquare size={16} />} onClick={() => ed.addRect()}>
            Chữ nhật
          </Menu.Item>
          <Menu.Item leftSection={<IconCircle size={16} />} onClick={() => ed.addCircle()}>
            Tròn
          </Menu.Item>
          <Menu.Item leftSection={<IconLine size={16} />} onClick={() => ed.addLine()}>
            Đường kẻ
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Divider orientation="vertical" />

      <ActionIcon.Group>
        <Tooltip label="Hoàn tác (Ctrl+Z)">
          <ActionIcon variant="default" size="lg" onClick={ed.undo} disabled={!ed.canUndo}>
            <IconArrowBackUp size={20} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Làm lại (Ctrl+Y)">
          <ActionIcon variant="default" size="lg" onClick={ed.redo} disabled={!ed.canRedo}>
            <IconArrowForwardUp size={20} />
          </ActionIcon>
        </Tooltip>
      </ActionIcon.Group>

      <Box style={{ flex: 1 }} />

      <Text size="sm" c="dimmed">
        {pageLabel}
      </Text>

      <ActionIcon.Group>
        <Tooltip label="Thu nhỏ">
          <ActionIcon variant="default" size="lg" onClick={ed.zoomOut}>
            <IconZoomOut size={20} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Về 50%">
          <ActionIcon variant="default" size="lg" onClick={() => ed.setZoom(0.5)}>
            <IconZoomReset size={20} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Phóng to">
          <ActionIcon variant="default" size="lg" onClick={ed.zoomIn}>
            <IconZoomIn size={20} />
          </ActionIcon>
        </Tooltip>
      </ActionIcon.Group>
      <Text size="sm" w={46} ta="center" c="dimmed">
        {Math.round(ed.zoom * 100)}%
      </Text>
    </Group>
  );
}
```

- [ ] **Step 3: Ghi đè `EditorTab.tsx`** (controlled bởi `DesignWorkspace`)

```tsx
import { useEffect, useRef } from "react";
import type { TemplateSet } from "@genposter/schema";

import { LeftPanel } from "./LeftPanel.js";
import { PageStrip } from "./PageStrip.js";
import { PropertiesPanel } from "./PropertiesPanel.js";
import { Toolbar } from "./Toolbar.js";
import type { EditorApi } from "./useEditor.js";
import "./editor.css";

export function EditorTab({
  ed,
  set,
  pageIndex,
  saving,
  onBack,
  onSave,
  onRenameSet,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onReorderPages,
}: {
  ed: EditorApi;
  set: TemplateSet | null;
  pageIndex: number;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
  onRenameSet: (name: string) => void;
  onSelectPage: (i: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (i: number) => void;
  onDeletePage: (i: number) => void;
  onReorderPages: (from: number, to: number) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);

  // Fit canvas to stage on mount/resize and when the set's canvas size changes.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !ed.ready) return;
    const fit = () => ed.fitTo(stage.clientWidth - 48, stage.clientHeight - 48);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [ed.ready, set?.width, set?.height]); // eslint-disable-line react-hooks/exhaustive-deps

  const pages = set?.pages ?? [];
  const aspect = set ? set.width / set.height : 0.7;
  const pageLabel = set ? `Trang ${Math.min(pageIndex + 1, pages.length)}/${pages.length}` : "";

  return (
    <div className="editor">
      <Toolbar
        ed={ed}
        name={set?.name ?? ""}
        onName={onRenameSet}
        onBack={onBack}
        onSave={onSave}
        saving={saving}
        pageLabel={pageLabel}
      />
      <div className="editor-body">
        <LeftPanel ed={ed} />
        <div className="stage" ref={stageRef}>
          <div className="stage-wrap">
            <canvas ref={ed.canvasElRef} />
          </div>
        </div>
        <PropertiesPanel ed={ed} />
      </div>
      <PageStrip
        pages={pages}
        currentIndex={pageIndex}
        aspect={aspect}
        onSelect={onSelectPage}
        onAdd={onAddPage}
        onDuplicate={onDuplicatePage}
        onDelete={onDeletePage}
        onReorder={onReorderPages}
      />
    </div>
  );
}
```

- [ ] **Step 4: Typecheck** (App.tsx vẫn dùng EditorTab kiểu cũ → sẽ lỗi tạm; Task 8 wiring sẽ sửa). Tạm chấp nhận.

Run: `pnpm --filter @genposter/desktop typecheck`
Expected: lỗi ở `App.tsx` vì `EditorTab` đổi props — dự kiến, sửa ở Task 8.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/features/editor/PageStrip.tsx apps/desktop/src/features/editor/Toolbar.tsx apps/desktop/src/features/editor/EditorTab.tsx
git commit -m "feat(editor): page strip + controlled EditorTab + toolbar back/page label"
```

---

## Task 7: `DesignHome` (trang tổng)

**Files:**
- Create: `apps/desktop/src/features/editor/DesignHome.tsx`

- [ ] **Step 1: Tạo `DesignHome.tsx`**

```tsx
import { useEffect, useState } from "react";
import {
  ActionIcon,
  AspectRatio,
  Box,
  Button,
  Card,
  Group,
  Menu,
  Modal,
  NumberInput,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCopy,
  IconDotsVertical,
  IconLayoutBoardSplit,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { DEFAULT_TEMPLATE_H, DEFAULT_TEMPLATE_W } from "@genposter/schema";

import {
  createTemplateSet,
  deleteTemplateSet,
  duplicateTemplateSet,
  listTemplateSets,
  renameTemplateSet,
  type TemplateSetSummary,
} from "../../lib/templateset-io.js";
import { nextUntitledName } from "../../lib/templateset-util.js";

export function DesignHome({
  onOpen,
}: {
  onOpen: (setId: string, pageId?: string) => void;
}) {
  const [sets, setSets] = useState<TemplateSetSummary[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [w, setW] = useState<number>(DEFAULT_TEMPLATE_W);
  const [h, setH] = useState<number>(DEFAULT_TEMPLATE_H);

  async function refresh() {
    try {
      setSets(await listTemplateSets());
    } catch (e) {
      notifications.show({ color: "red", message: `Không đọc được mẫu: ${String(e)}` });
    }
  }
  useEffect(() => {
    void refresh();
  }, []);

  async function doCreate() {
    const name = nameInput.trim() || nextUntitledName(sets.map((s) => s.name));
    try {
      const set = await createTemplateSet(name, w, h);
      setCreateOpen(false);
      setNameInput("");
      onOpen(set.id);
    } catch (e) {
      notifications.show({ color: "red", message: `Lỗi tạo mẫu: ${String(e)}` });
    }
  }

  async function doRename() {
    if (!renameId) return;
    try {
      await renameTemplateSet(renameId, nameInput.trim() || "Mẫu");
      setRenameId(null);
      setNameInput("");
      await refresh();
    } catch (e) {
      notifications.show({ color: "red", message: `Lỗi đổi tên: ${String(e)}` });
    }
  }

  async function doDuplicate(id: string) {
    try {
      await duplicateTemplateSet(id);
      await refresh();
      notifications.show({ color: "teal", message: "Đã nhân bản mẫu" });
    } catch (e) {
      notifications.show({ color: "red", message: `Lỗi nhân bản: ${String(e)}` });
    }
  }

  async function doDelete(id: string, name: string) {
    if (!window.confirm(`Xoá mẫu "${name}"? Không thể hoàn tác.`)) return;
    try {
      await deleteTemplateSet(id);
      await refresh();
    } catch (e) {
      notifications.show({ color: "red", message: `Lỗi xoá: ${String(e)}` });
    }
  }

  return (
    <div className="design-home">
      <Group justify="space-between" align="center" mb="lg">
        <Title order={3}>Mẫu của bạn</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={() => setCreateOpen(true)}>
          Tạo mẫu mới
        </Button>
      </Group>

      {sets.length === 0 ? (
        <Stack align="center" gap="sm" py={60} c="dimmed">
          <IconLayoutBoardSplit size={48} />
          <Text>Chưa có mẫu nào. Bấm “Tạo mẫu mới” để bắt đầu.</Text>
        </Stack>
      ) : (
        <Stack gap="md">
          {sets.map((s) => (
            <Card key={s.id} withBorder radius="lg" padding="md">
              <Group justify="space-between" mb="sm">
                <Group gap="xs">
                  <Text fw={700}>{s.name}</Text>
                  <Text size="sm" c="dimmed">
                    {s.pages.length} trang
                  </Text>
                </Group>
                <Menu position="bottom-end" withinPortal>
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray">
                      <IconDotsVertical size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconPencil size={14} />}
                      onClick={() => {
                        setRenameId(s.id);
                        setNameInput(s.name);
                      }}
                    >
                      Đổi tên
                    </Menu.Item>
                    <Menu.Item leftSection={<IconCopy size={14} />} onClick={() => void doDuplicate(s.id)}>
                      Nhân bản
                    </Menu.Item>
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => void doDelete(s.id, s.name)}
                    >
                      Xoá mẫu
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>

              <ScrollArea type="auto" scrollbars="x" offsetScrollbars>
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  {s.pages.map((p, i) => (
                    <UnstyledButton
                      key={p.id}
                      className="home-thumb"
                      onClick={() => onOpen(s.id, p.id)}
                    >
                      <AspectRatio ratio={s.width / s.height} style={{ width: 120 }}>
                        {p.thumbnail ? (
                          <img
                            src={p.thumbnail}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        ) : (
                          <Box bg="gray.1" />
                        )}
                      </AspectRatio>
                      <Text size="xs" ta="center" mt={4} c="dimmed">
                        {i + 1}
                      </Text>
                    </UnstyledButton>
                  ))}
                  <Tooltip label="Thêm trang">
                    <UnstyledButton className="home-thumb add" onClick={() => onOpen(s.id, "__add__")}>
                      <AspectRatio ratio={s.width / s.height} style={{ width: 120 }}>
                        <Box>
                          <Stack align="center" justify="center" gap={4} h="100%">
                            <IconPlus size={22} />
                            <Text size="xs">Thêm trang</Text>
                          </Stack>
                        </Box>
                      </AspectRatio>
                    </UnstyledButton>
                  </Tooltip>
                </Group>
              </ScrollArea>
            </Card>
          ))}
        </Stack>
      )}

      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="Tạo mẫu mới" centered>
        <Stack>
          <TextInput
            label="Tên mẫu"
            placeholder="Bỏ trống = Mẫu mới (N)"
            value={nameInput}
            onChange={(e) => setNameInput(e.currentTarget.value)}
            data-autofocus
          />
          <Group grow>
            <NumberInput label="Rộng (px)" min={100} value={w} onChange={(v) => setW(typeof v === "number" ? v : DEFAULT_TEMPLATE_W)} />
            <NumberInput label="Cao (px)" min={100} value={h} onChange={(v) => setH(typeof v === "number" ? v : DEFAULT_TEMPLATE_H)} />
          </Group>
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={() => void doCreate()}>Tạo</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={renameId !== null} onClose={() => setRenameId(null)} title="Đổi tên mẫu" centered>
        <Stack>
          <TextInput
            label="Tên mẫu"
            value={nameInput}
            onChange={(e) => setNameInput(e.currentTarget.value)}
            data-autofocus
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setRenameId(null)}>
              Hủy
            </Button>
            <Button onClick={() => void doRename()}>Lưu</Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
```

> Lưu ý: nút "+ Thêm trang" ở trang tổng gọi `onOpen(s.id, "__add__")`; `DesignWorkspace.openSet` sẽ hiểu `pageId === "__add__"` là mở mẫu rồi thêm 1 trang mới (Task 8).

- [ ] **Step 2: Typecheck** (vẫn còn lỗi App.tsx như Task 6 — chưa wiring).

Run: `pnpm --filter @genposter/desktop typecheck`
Expected: chỉ còn lỗi liên quan `App.tsx`/`DesignWorkspace` chưa có.

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/features/editor/DesignHome.tsx
git commit -m "feat(editor): DesignHome overview grid"
```

---

## Task 8: `DesignWorkspace` + wiring `App` + CSS

**Files:**
- Create: `apps/desktop/src/features/editor/DesignWorkspace.tsx`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/features/editor/editor.css`

- [ ] **Step 1: Tạo `DesignWorkspace.tsx`**

```tsx
import { useReducer, useRef, useState } from "react";
import { notifications } from "@mantine/notifications";
import type { TemplateSet } from "@genposter/schema";

import { loadTemplateSet, saveTemplateSet } from "../../lib/templateset-io.js";
import { emptyPage, genId } from "../../lib/templateset-util.js";
import { renderThumb } from "../../lib/thumbnail.js";
import { DesignHome } from "./DesignHome.js";
import { EditorTab } from "./EditorTab.js";
import { useEditor } from "./useEditor.js";

export function DesignWorkspace() {
  const ed = useEditor();
  const setRef = useRef<TemplateSet | null>(null);
  const [view, setView] = useState<"home" | "editor">("home");
  const [pageIndex, setPageIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [, bump] = useReducer((x) => x + 1, 0);

  function loadPageIntoEditor(set: TemplateSet, i: number) {
    ed.setCanvasSize(set.width, set.height);
    void ed.loadScene(set.pages[i]!.scene);
  }

  async function commitCurrent() {
    const set = setRef.current;
    if (!set || view !== "editor") return;
    const p = set.pages[pageIndex];
    if (!p) return;
    p.scene = ed.exportScene();
    try {
      p.thumbnail = await renderThumb(p.scene, set.width, set.height);
    } catch {
      // keep previous thumbnail on failure
    }
  }

  async function persist() {
    const set = setRef.current;
    if (!set) return;
    setSaving(true);
    try {
      await saveTemplateSet(set);
    } finally {
      setSaving(false);
    }
  }

  async function openSet(setId: string, pageId?: string) {
    try {
      const set = await loadTemplateSet(setId);
      setRef.current = set;
      let idx = 0;
      if (pageId === "__add__") {
        set.pages.push(emptyPage());
        idx = set.pages.length - 1;
      } else if (pageId) {
        const found = set.pages.findIndex((p) => p.id === pageId);
        idx = found >= 0 ? found : 0;
      }
      setPageIndex(idx);
      setView("editor");
      loadPageIntoEditor(set, idx);
      bump();
    } catch (e) {
      notifications.show({ color: "red", message: `Lỗi mở mẫu: ${String(e)}` });
    }
  }

  async function goHome() {
    await commitCurrent();
    await persist();
    setView("home");
    bump();
  }

  async function onSave() {
    await commitCurrent();
    await persist();
    notifications.show({ color: "teal", message: "Đã lưu mẫu" });
    bump();
  }

  async function selectPage(i: number) {
    const set = setRef.current;
    if (!set || i === pageIndex) return;
    await commitCurrent();
    setPageIndex(i);
    loadPageIntoEditor(set, i);
    bump();
  }

  async function addPage() {
    const set = setRef.current;
    if (!set) return;
    await commitCurrent();
    set.pages.push(emptyPage());
    const i = set.pages.length - 1;
    setPageIndex(i);
    loadPageIntoEditor(set, i);
    bump();
  }

  async function duplicatePage(i: number) {
    const set = setRef.current;
    if (!set) return;
    await commitCurrent();
    const src = set.pages[i]!;
    set.pages.splice(i + 1, 0, {
      id: genId("page"),
      name: src.name,
      scene: JSON.parse(JSON.stringify(src.scene)),
      thumbnail: src.thumbnail,
    });
    setPageIndex(i + 1);
    loadPageIntoEditor(set, i + 1);
    bump();
  }

  async function deletePage(i: number) {
    const set = setRef.current;
    if (!set || set.pages.length <= 1) return;
    await commitCurrent();
    set.pages.splice(i, 1);
    const ni = Math.min(pageIndex, set.pages.length - 1);
    setPageIndex(ni);
    loadPageIntoEditor(set, ni);
    bump();
  }

  function reorderPages(from: number, to: number) {
    const set = setRef.current;
    if (!set || from === to) return;
    const curId = set.pages[pageIndex]?.id;
    const [moved] = set.pages.splice(from, 1);
    const target = from < to ? to - 1 : to;
    set.pages.splice(target, 0, moved!);
    const ni = set.pages.findIndex((p) => p.id === curId);
    setPageIndex(ni < 0 ? target : ni);
    bump();
  }

  function renameSet(name: string) {
    const set = setRef.current;
    if (!set) return;
    set.name = name;
    bump();
  }

  return (
    <>
      {view === "home" && <DesignHome onOpen={(id, pid) => void openSet(id, pid)} />}
      <div style={{ display: view === "editor" ? "flex" : "none", flex: 1, minHeight: 0 }}>
        <EditorTab
          ed={ed}
          set={setRef.current}
          pageIndex={pageIndex}
          saving={saving}
          onBack={() => void goHome()}
          onSave={() => void onSave()}
          onRenameSet={renameSet}
          onSelectPage={(i) => void selectPage(i)}
          onAddPage={() => void addPage()}
          onDuplicatePage={(i) => void duplicatePage(i)}
          onDeletePage={(i) => void deletePage(i)}
          onReorderPages={reorderPages}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Wiring `App.tsx`**

Đổi import:

```ts
import { EditorTab } from "./features/editor/EditorTab.js";
```

thành:

```ts
import { DesignWorkspace } from "./features/editor/DesignWorkspace.js";
```

Và trong phần `<main className="main">`, thay khối:

```tsx
        <div
          style={{
            display: tab === "design" ? "flex" : "none",
            flex: 1,
            minHeight: 0,
          }}
        >
          <EditorTab />
        </div>
```

thành:

```tsx
        <div
          style={{
            display: tab === "design" ? "flex" : "none",
            flex: 1,
            minHeight: 0,
          }}
        >
          <DesignWorkspace />
        </div>
```

- [ ] **Step 3: Thêm CSS vào `editor.css`** (cuối file)

```css
/* ---- Trang tổng ---- */
.design-home {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 22px;
  background: var(--rv-bg);
}
.home-thumb {
  border: 1px solid var(--mantine-color-gray-3);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.home-thumb:hover {
  border-color: var(--rv-orange);
}
.home-thumb.add {
  border-style: dashed;
  color: var(--mantine-color-dimmed);
}

/* ---- Dải trang trong trình sửa ---- */
.page-strip {
  border-top: 1px solid var(--mantine-color-gray-3);
  background: #fff;
}
.page-thumb {
  border: 2px solid var(--mantine-color-gray-3);
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
  display: block;
}
.page-thumb.add {
  border-style: dashed;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--mantine-color-dimmed);
}
.page-thumb[data-active] {
  border-color: var(--rv-orange);
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @genposter/desktop typecheck`
Expected: exit 0 (sạch).

- [ ] **Step 5: Build**

Run: `pnpm --filter @genposter/desktop build`
Expected: built, exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/features/editor/DesignWorkspace.tsx apps/desktop/src/App.tsx apps/desktop/src/features/editor/editor.css
git commit -m "feat(editor): DesignWorkspace wiring + overview/page-strip CSS"
```

---

## Task 9: Kiểm thử thủ công + chạy thử

**Files:** (không sửa code; chỉ verify, sửa nếu lỗi)

- [ ] **Step 1: Mở dev**

Run: `pnpm dev`
Expected: vite ready ở `http://127.0.0.1:1420/`, cửa sổ app mở; tab Thiết kế hiện **Trang tổng**.

- [ ] **Step 2: Checklist thủ công**

1. Tạo mẫu (bỏ trống tên → "Mẫu mới (1)") → vào trình sửa, canvas đúng 1588×2248.
2. Thêm vài trang, kéo sắp xếp, nhân bản, xoá; không cho xoá trang cuối.
3. Sửa trang A → đổi sang B → quay lại A: nội dung giữ nguyên.
4. Lưu mẫu → bấm ← Trang tổng → thấy thumbnail trang ở card.
5. Đóng app, `pnpm dev` lại → mẫu + trang còn nguyên; bấm 1 trang ở trang tổng → mở đúng trang.
6. Đổi tên / nhân bản / xoá mẫu ở trang tổng.
7. Sang tab **Tạo ảnh**: dropdown "Mẫu thiết kế" liệt kê dạng "Tên mẫu · Trang k/n"; chọn 1 trang + 1 sheet → Dựng slide → Xuất (nếu có dữ liệu Excel).

- [ ] **Step 3: Dừng dev**

Đóng cửa sổ app (hoặc Ctrl+C). Nếu cần: `taskkill /F /T /PID <pid pnpm dev>`.

- [ ] **Step 4: (nếu sửa lỗi) Commit**

```bash
git add -A
git commit -m "fix(editor): khắc phục lỗi phát hiện khi kiểm thử"
```

---

## Self-Review (đã rà)

- **Spec coverage:** mục 3 → Task 1/3; thumbnail (3.1) → Task 2; điều hướng (4) + workspace → Task 8; Trang tổng (5) → Task 7; trình sửa + dải trang + size động + lưu (6) → Task 5/6/8; tương thích Tạo ảnh (8) → Task 4; di trú (3.3) → `normalizeSet` Task 1; ca biên (9) → chặn xoá trang cuối (PageStrip/Workspace), unique id (templateset-io), commit-trước-khi-đổi (Workspace). Đủ.
- **Type consistency:** `TemplateSet`/`TemplatePage`/`TemplateSetSummary`, `makePageRef`/`parsePageRef`, `setCanvasSize`, props `EditorTab`/`PageStrip`/`DesignHome` khớp giữa các task.
- **Placeholder scan:** không có TBD; mọi step có code/lệnh cụ thể. Riêng `"__add__"` là sentinel có chủ đích, xử lý trong `openSet`.
- **Thứ tự lỗi typecheck tạm thời:** Task 4/6/7 báo trước rằng typecheck sẽ đỏ tới khi wiring ở Task 8 — đã ghi rõ kỳ vọng để worker không hoảng.

---

## Execution Handoff

Hai cách chạy plan:
1. **Subagent-Driven (khuyến nghị)** — mỗi task một subagent mới, review giữa các task.
2. **Inline** — chạy tuần tự trong phiên này, có checkpoint.
