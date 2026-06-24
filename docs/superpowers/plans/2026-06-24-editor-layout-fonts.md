# Bố trí editor Hybrid D + font Việt hoá — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor tab Thiết kế theo layout Hybrid D (toolbar gọn, panel trái 240px, rail phải 44px, ContextBar, Inspector overlay) và mở rộng thư viện font Việt hoá offline (~48 family) với dropdown có tìm kiếm + preview.

**Architecture:** Giữ `DesignWorkspace` + `useEditor` không đổi API. `EditorTab` đổi grid `240px | 1fr | 44px`; `PropertiesPanel` chỉ render trong `InspectorDrawer` overlay; căn chỉnh/lớp/nhân bản chuyển `ContextBar`. Font: catalog tách `font-catalog.ts` (dữ liệu thuần) + `fonts.ts` load `FontFace`; script `fetch-brand-fonts.mjs` tải `.ttf` vào `data/brand/fonts/`.

**Tech Stack:** React 18, Mantine v7 (`Combobox`, `Drawer` hoặc custom overlay), Tabler Icons, Fabric.js v6, vitest (catalog/grouping), Node script (tải font).

**Spec:** `docs/superpowers/specs/2026-06-24-editor-layout-fonts-design.md`

**Lưu ý môi trường:** shell PowerShell — nối lệnh bằng `;`. Verify mỗi task: `pnpm --filter @genposter/desktop typecheck` + `build`; logic font catalog: `pnpm --filter @genposter/desktop test`.

---

## File Structure

**Tạo mới**
- `apps/desktop/src/features/editor/ContextBar.tsx` — thanh nổi căn/lớp/thao tác.
- `apps/desktop/src/features/editor/RightRail.tsx` — cột icon 44px, nút Inspector.
- `apps/desktop/src/features/editor/InspectorDrawer.tsx` — overlay + backdrop + bọc PropertiesPanel.
- `apps/desktop/src/lib/font-catalog.ts` — mảng `FONT_CATALOG` (48 family, tier, group).
- `apps/desktop/src/lib/font-catalog.test.ts` — test grouping / không trùng family.
- `scripts/fetch-brand-fonts.mjs` — tải `.ttf` từ Google Fonts.

**Sửa**
- `apps/desktop/src/features/editor/Toolbar.tsx` — gỡ menu Thêm.
- `apps/desktop/src/features/editor/EditorTab.tsx` — grid mới, ghép ContextBar/RightRail/InspectorDrawer.
- `apps/desktop/src/features/editor/LeftPanel.tsx` — persist tab `localStorage`.
- `apps/desktop/src/features/editor/PropertiesPanel.tsx` — gỡ accordion Sắp xếp; Combobox font.
- `apps/desktop/src/lib/fonts.ts` — đọc catalog, `availableFamilies()` có group/tier.
- `apps/desktop/src/features/editor/editor.css` — grid 240/1fr/44, context bar, drawer, backdrop.
- `data/brand/fonts/README.md` — hướng dẫn `pnpm fetch:fonts`.
- `package.json` (root) — script `fetch:fonts`.
- `apps/desktop/package.json` — (nếu cần) re-export script.

**Không sửa**
- `DesignWorkspace.tsx`, `useEditor.ts`, `PageStrip.tsx`, `DesignHome.tsx`.

---

## Task 1: Toolbar gọn + CSS grid shell

**Files:**
- Modify: `apps/desktop/src/features/editor/Toolbar.tsx`
- Modify: `apps/desktop/src/features/editor/editor.css`
- Modify: `apps/desktop/src/features/editor/EditorTab.tsx`

- [ ] **Step 1: Thu gọn Toolbar — xóa menu Thêm**

Trong `Toolbar.tsx`, xóa toàn bộ import `Menu`, `IconHeading`, `IconTypography`, `IconPhotoPlus`, `IconPhotoUp`, `IconPlus`, `IconSquare`, `IconCircle`, `IconLine`, `pickImageDataUrl`, và khối JSX từ `<Divider />` sau nút Lưu đến hết `<Menu>...</Menu>` (giữ Divider trước undo nếu muốn, hoặc gộp spacing).

Kết quả toolbar chỉ còn: Trang tổng, tên, Lưu, (divider), undo/redo, spacer, Trang k/n, zoom.

- [ ] **Step 2: Đổi grid trong `editor.css`**

```css
.editor-body {
  display: grid;
  grid-template-columns: 240px 1fr 44px;
  flex: 1;
  min-height: 0;
}

.stage-column {
  position: relative;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel.right-rail {
  border-left: 1px solid var(--mantine-color-gray-3);
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
```

Xóa hoặc giữ `.panel.right` cho drawer nội dung (sẽ không dùng cột cố định 300px nữa).

- [ ] **Step 3: Tạm thời stub RightRail trong EditorTab**

Tạo file tối thiểu `RightRail.tsx` (sẽ hoàn thiện Task 4):

```tsx
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconLayout2 } from "@tabler/icons-react";

export function RightRail({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <aside className="panel right-rail">
      <Tooltip label="Inspector" position="left">
        <ActionIcon
          variant={active ? "filled" : "default"}
          color={active ? "riviu" : "gray"}
          size="lg"
          onClick={onToggle}
        >
          <IconLayout2 size={20} />
        </ActionIcon>
      </Tooltip>
    </aside>
  );
}
```

Trong `EditorTab.tsx`, thay `<PropertiesPanel ed={ed} />` bằng:

```tsx
const [inspectorOpen, setInspectorOpen] = useState(false);
// ...
<div className="stage-column">
  <div className="stage" ref={stageRef}>
    <div className="stage-wrap">
      <canvas ref={ed.canvasElRef} />
    </div>
  </div>
  {inspectorOpen && <PropertiesPanel ed={ed} />}
</div>
<RightRail active={inspectorOpen} onToggle={() => setInspectorOpen((o) => !o)} />
```

(Tạm đặt PropertiesPanel trong cột giữa — Task 4 chuyển sang overlay.)

- [ ] **Step 4: Verify**

Run: `pnpm --filter @genposter/desktop typecheck`
Expected: exit 0

Run: `pnpm --filter @genposter/desktop build`
Expected: exit 0

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/features/editor/Toolbar.tsx apps/desktop/src/features/editor/editor.css apps/desktop/src/features/editor/EditorTab.tsx apps/desktop/src/features/editor/RightRail.tsx
git commit -m "refactor(editor): slim toolbar and 240/1fr/44 grid shell"
```

---

## Task 2: ContextBar (căn chỉnh + lớp + thao tác)

**Files:**
- Create: `apps/desktop/src/features/editor/ContextBar.tsx`
- Modify: `apps/desktop/src/features/editor/EditorTab.tsx`
- Modify: `apps/desktop/src/features/editor/editor.css`

- [ ] **Step 1: Tạo `ContextBar.tsx`**

Copy pattern icon từ `PropertiesPanel.tsx` accordion Sắp xếp (`ALIGNS`, order buttons, flip/lock/duplicate/delete, distribute khi `many.length >= 3`). Component:

```tsx
import { ActionIcon, Group, Paper, Tooltip } from "@mantine/core";
import { /* same icons as PropertiesPanel arrange section */ } from "@tabler/icons-react";
import type { EditorApi } from "./useEditor.js";

export function ContextBar({ ed }: { ed: EditorApi }) {
  void ed.tick;
  const obj = ed.getActive();
  if (!obj) return null;
  const many = ed.getActiveMany();
  // ... IconBtn helper hoặc import từ shared — có thể duplicate nhỏ 20 dòng
  return (
    <Paper className="context-bar" shadow="sm" radius="md" p={4} withBorder>
      <Group gap={4} wrap="nowrap">
        {/* 6 align ActionIcon.Group */}
        {/* 4 order */}
        {/* duplicate, lock, delete */}
        {many.length >= 3 && (/* distribute h/v */)}
      </Group>
    </Paper>
  );
}
```

- [ ] **Step 2: CSS context bar**

```css
.stage {
  position: relative;
}
.context-bar {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  background: #fff;
}
```

- [ ] **Step 3: Gắn vào EditorTab**

Trong `.stage`, trước `.stage-wrap`:

```tsx
<ContextBar ed={ed} />
```

- [ ] **Step 4: Gỡ accordion `arrange` khỏi PropertiesPanel**

Xóa `<Accordion.Item value="arrange">...</Accordion.Item>` và import icon chỉ dùng cho arrange (nếu không còn dùng). Cập nhật `defaultValue` bỏ `"arrange"`.

- [ ] **Step 5: Verify + commit**

```bash
pnpm --filter @genposter/desktop typecheck
pnpm --filter @genposter/desktop build
git add apps/desktop/src/features/editor/ContextBar.tsx apps/desktop/src/features/editor/EditorTab.tsx apps/desktop/src/features/editor/PropertiesPanel.tsx apps/desktop/src/features/editor/editor.css
git commit -m "feat(editor): floating ContextBar; drop arrange from inspector"
```

---

## Task 3: InspectorDrawer overlay + persist

**Files:**
- Create: `apps/desktop/src/features/editor/InspectorDrawer.tsx`
- Modify: `apps/desktop/src/features/editor/EditorTab.tsx`
- Modify: `apps/desktop/src/features/editor/editor.css`

- [ ] **Step 1: Hook persist inspector**

Trong `EditorTab.tsx`:

```tsx
const INSPECTOR_KEY = "genposter.editor.inspectorOpen";

function readInspectorOpen(): boolean {
  try {
    return localStorage.getItem(INSPECTOR_KEY) === "true";
  } catch {
    return false;
  }
}

// useState(readInspectorOpen)
// useEffect save when inspectorOpen changes
```

Khi `ed.tick` thay đổi và có `ed.getActive()` mà chưa từng đóng trong phiên — spec cho phép mở tự động lần đầu chọn object: `useEffect` nếu `getActive()` && `!userClosedRef` → `setInspectorOpen(true)`.

- [ ] **Step 2: Tạo InspectorDrawer**

```tsx
import { ActionIcon, Box, Group, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useEffect } from "react";
import { PropertiesPanel } from "./PropertiesPanel.js";
import type { EditorApi } from "./useEditor.js";

export function InspectorDrawer({
  ed,
  opened,
  onClose,
}: {
  ed: EditorApi;
  opened: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!opened) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opened, onClose]);

  if (!opened) return null;

  const obj = ed.getActive();
  const title = obj?.type ?? "Đối tượng";

  return (
    <>
      <div className="inspector-backdrop" onClick={onClose} aria-hidden />
      <aside className="inspector-drawer">
        <Group justify="space-between" mb="sm" wrap="nowrap">
          <Text fw={600} size="sm" tt="capitalize">
            {title}
          </Text>
          <ActionIcon variant="subtle" color="gray" onClick={onClose}>
            <IconX size={18} />
          </ActionIcon>
        </Group>
        <Box className="inspector-drawer-body">
          <PropertiesPanel ed={ed} embedded />
        </Box>
      </aside>
    </>
  );
}
```

- [ ] **Step 3: PropertiesPanel hỗ trợ `embedded`**

Thêm prop tùy chọn `embedded?: boolean` — khi `embedded`, bỏ wrapper `<aside className="panel right">` và empty state vẫn hiện trong drawer body.

- [ ] **Step 4: CSS overlay**

```css
.inspector-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
  z-index: 10;
}
.inspector-drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 300px;
  z-index: 11;
  background: #fff;
  border-left: 1px solid var(--mantine-color-gray-3);
  padding: 12px;
  overflow-y: auto;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.08);
}
```

Backdrop + drawer đặt trong `.stage-column` (absolute relative to stage column, không che left panel).

- [ ] **Step 5: Wire EditorTab**

```tsx
<div className="stage-column">
  <div className="stage" ref={stageRef}>
    <ContextBar ed={ed} />
    <div className="stage-wrap">
      <canvas ref={ed.canvasElRef} />
    </div>
  </div>
  <InspectorDrawer ed={ed} opened={inspectorOpen} onClose={() => setInspectorOpen(false)} />
</div>
<RightRail active={inspectorOpen} onToggle={() => setInspectorOpen((o) => !o)} />
```

Xóa PropertiesPanel trực tiếp khỏi grid cột phải.

- [ ] **Step 6: Verify + commit**

```bash
pnpm --filter @genposter/desktop typecheck
pnpm --filter @genposter/desktop build
git commit -m "feat(editor): inspector overlay drawer with Esc and persist"
```

---

## Task 4: LeftPanel — nhớ tab global

**Files:**
- Modify: `apps/desktop/src/features/editor/LeftPanel.tsx`

- [ ] **Step 1: Đọc/ghi localStorage**

```tsx
const LEFT_TAB_KEY = "genposter.editor.leftTab";
const VALID: Sub[] = ["add", "upload", "bg", "data", "layers"];

function readLeftTab(): Sub {
  try {
    const v = localStorage.getItem(LEFT_TAB_KEY);
    if (v && (VALID as string[]).includes(v)) return v as Sub;
  } catch { /* ignore */ }
  return "add";
}

// useState<Sub>(readLeftTab)
// Tabs onChange: setSub + localStorage.setItem(LEFT_TAB_KEY, v)
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm --filter @genposter/desktop typecheck
git commit -m "feat(editor): persist left panel tab in localStorage"
```

---

## Task 5: Font catalog (TDD) + refactor fonts.ts

**Files:**
- Create: `apps/desktop/src/lib/font-catalog.ts`
- Create: `apps/desktop/src/lib/font-catalog.test.ts`
- Modify: `apps/desktop/src/lib/fonts.ts`

- [ ] **Step 1: Viết test thất bại**

```ts
import { describe, expect, it } from "vitest";
import {
  FONT_CATALOG,
  fontFamilyGroups,
  uniqueFamilies,
} from "./font-catalog.js";

describe("font-catalog", () => {
  it("has at least 40 unique families", () => {
    expect(uniqueFamilies().length).toBeGreaterThanOrEqual(40);
  });

  it("every entry has tier A B or C", () => {
    for (const e of FONT_CATALOG) {
      expect(["A", "B", "C"]).toContain(e.tier);
    }
  });

  it("groups are non-empty strings", () => {
    const groups = fontFamilyGroups();
    expect(groups.length).toBeGreaterThan(3);
    for (const g of groups) {
      expect(g.families.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Tạo `font-catalog.ts` (dùng helper — liệt kê đủ 48 family)**

```ts
export type FontTier = "A" | "B" | "C";

export interface FontCatalogEntry {
  family: string;
  file: string;
  weight: string;
  style: "normal" | "italic";
  tier: FontTier;
  group: string;
}

const G = {
  sansBody: "Sans — nội dung (VN)",
  serif: "Serif (VN)",
  display: "Sans — tiêu đề & display (VN)",
  rounded: "Bo tròn / thân thiện (VN)",
  decor: "Trang trí & chữ tay (VN)",
} as const;

function pair(
  family: string,
  fileBase: string,
  tier: FontTier,
  group: string,
): FontCatalogEntry[] {
  return [
    { family, file: `${fileBase}-Regular.ttf`, weight: "400", style: "normal", tier, group },
    { family, file: `${fileBase}-Bold.ttf`, weight: "700", style: "normal", tier, group },
  ];
}

function single(
  family: string,
  file: string,
  weight: string,
  tier: FontTier,
  group: string,
  style: "normal" | "italic" = "normal",
): FontCatalogEntry {
  return { family, file, weight, style, tier, group };
}

const beVietnam: FontCatalogEntry[] = [
  single("Be Vietnam Pro", "BeVietnamPro-Regular.ttf", "400", "A", G.sansBody),
  single("Be Vietnam Pro", "BeVietnamPro-Italic.ttf", "400", "A", G.sansBody, "italic"),
  single("Be Vietnam Pro", "BeVietnamPro-Medium.ttf", "500", "A", G.sansBody),
  single("Be Vietnam Pro", "BeVietnamPro-SemiBold.ttf", "600", "A", G.sansBody),
  single("Be Vietnam Pro", "BeVietnamPro-Bold.ttf", "700", "A", G.sansBody),
];

export const FONT_CATALOG: FontCatalogEntry[] = [
  ...beVietnam,
  // Tier A sans body (17 thêm)
  ...pair("Inter", "Inter", "A", G.sansBody),
  ...pair("Noto Sans", "NotoSans", "A", G.sansBody),
  ...pair("Open Sans", "OpenSans", "A", G.sansBody),
  ...pair("Roboto", "Roboto", "A", G.sansBody),
  ...pair("Source Sans 3", "SourceSans3", "A", G.sansBody),
  ...pair("IBM Plex Sans", "IBMPlexSans", "A", G.sansBody),
  ...pair("Fira Sans", "FiraSans", "A", G.sansBody),
  ...pair("Barlow", "Barlow", "A", G.sansBody),
  ...pair("Manrope", "Manrope", "A", G.sansBody),
  ...pair("DM Sans", "DMSans", "A", G.sansBody),
  ...pair("Work Sans", "WorkSans", "A", G.sansBody),
  ...pair("Rubik", "Rubik", "A", G.sansBody),
  ...pair("Mulish", "Mulish", "A", G.sansBody),
  ...pair("Ubuntu", "Ubuntu", "A", G.sansBody),
  ...pair("Cabin", "Cabin", "A", G.sansBody),
  ...pair("Public Sans", "PublicSans", "A", G.sansBody),
  ...pair("Plus Jakarta Sans", "PlusJakartaSans", "A", G.sansBody),
  // Tier A serif (8)
  ...pair("Noto Serif", "NotoSerif", "A", G.serif),
  ...pair("Merriweather", "Merriweather", "A", G.serif),
  ...pair("Lora", "Lora", "A", G.serif),
  ...pair("Source Serif 4", "SourceSerif4", "A", G.serif),
  ...pair("IBM Plex Serif", "IBMPlexSerif", "A", G.serif),
  ...pair("PT Serif", "PTSerif", "A", G.serif),
  ...pair("Literata", "Literata", "A", G.serif),
  ...pair("Roboto Slab", "RobotoSlab", "A", G.serif),
  // Tier B display (10)
  ...pair("Lexend", "Lexend", "B", G.display),
  ...pair("Oswald", "Oswald", "B", G.display),
  ...pair("Barlow Condensed", "BarlowCondensed", "B", G.display),
  single("Anton", "Anton-Regular.ttf", "400", "B", G.display),
  ...pair("Exo 2", "Exo2", "B", G.display),
  ...pair("Josefin Sans", "JosefinSans", "B", G.display),
  ...pair("Raleway", "Raleway", "B", G.display),
  ...pair("Signika", "Signika", "B", G.display),
  ...pair("Archivo", "Archivo", "B", G.display),
  single("Montserrat", "Montserrat-Bold.ttf", "700", "B", G.display),
  single("Montserrat", "Montserrat-ExtraBold.ttf", "800", "B", G.display),
  // Tier B rounded (6)
  ...pair("Nunito", "Nunito", "B", G.rounded),
  ...pair("Quicksand", "Quicksand", "B", G.rounded),
  ...pair("Comfortaa", "Comfortaa", "B", G.rounded),
  ...pair("M PLUS Rounded 1c", "MPLUSRounded1c", "B", G.rounded),
  ...pair("Baloo 2", "Baloo2", "B", G.rounded),
  single("Varela Round", "VarelaRound-Regular.ttf", "400", "B", G.rounded),
  // Tier C decor (6)
  ...pair("Caveat", "Caveat", "C", G.decor),
  single("Satisfy", "Satisfy-Regular.ttf", "400", "C", G.decor),
  single("Allison", "Allison-Regular.ttf", "400", "C", G.decor),
  ...pair("Shantell Sans", "ShantellSans", "C", G.decor),
  single("Patrick Hand", "PatrickHand-Regular.ttf", "400", "C", G.decor),
  single("Dancing Script", "DancingScript-Regular.ttf", "400", "C", G.decor),
];

export function uniqueFamilies(): string[] {
  return [...new Set(FONT_CATALOG.map((e) => e.family))];
}
// ... fontFamilyGroups, tierForFamily như trên
```

`uniqueFamilies().length` === **48**.

- [ ] **Step 3: Refactor `fonts.ts`**

```ts
import { FONT_CATALOG, tierForFamily, type FontTier } from "./font-catalog.js";

const AVAILABLE = new Set<string>();

export interface FontFamilyOption {
  value: string;
  label: string;
  group: string;
  tier: FontTier;
}

export async function ensureFonts(): Promise<void> {
  if (loaded) return;
  const dir = paths.brandFonts();
  for (const f of FONT_CATALOG) {
    const p = join(dir, f.file);
    if (!(await exists(p))) continue;
    try {
      const face = new FontFace(f.family, `url("${assetUrl(p)}")`, {
        weight: f.weight,
        style: f.style,
      });
      await face.load();
      document.fonts.add(face);
      AVAILABLE.add(f.family);
    } catch { /* skip */ }
  }
  try { await document.fonts.ready; } catch { /* */ }
  loaded = true;
}

export function availableFamilies(): FontFamilyOption[] {
  const seen = new Set<string>();
  const out: FontFamilyOption[] = [];
  for (const e of FONT_CATALOG) {
    if (!AVAILABLE.has(e.family) || seen.has(e.family)) continue;
    seen.add(e.family);
    out.push({
      value: e.family,
      label: e.family,
      group: e.group,
      tier: tierForFamily(e.family) ?? "A",
    });
  }
  return out.sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label));
}

export function getFontPreviewStyle(family: string): React.CSSProperties {
  return { fontFamily: `"${family}", sans-serif` };
}
```

Xóa mảng `FONTS` cũ và list ảo Arial/Georgia.

- [ ] **Step 4: Chạy test**

Run: `pnpm --filter @genposter/desktop test`
Expected: PASS (sau khi catalog đủ 40+ families)

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/lib/font-catalog.ts apps/desktop/src/lib/font-catalog.test.ts apps/desktop/src/lib/fonts.ts
git commit -m "feat(fonts): Vietnamese font catalog with tier groups"
```

---

## Task 6: Script tải font + README

**Files:**
- Create: `scripts/fetch-brand-fonts.mjs`
- Modify: `package.json` (root)
- Modify: `data/brand/fonts/README.md`

- [ ] **Step 1: Script tải font**

```js
#!/usr/bin/env node
/**
 * Downloads .ttf files listed in font-catalog (via static Google Fonts URLs).
 * Run from repo root: pnpm fetch:fonts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "data", "brand", "fonts");

// Import catalog: use dynamic read of font-catalog.ts entries exported as JSON
// Practical approach: duplicate minimal {file, googleFamily, weight} list in this script
// OR generate fonts-manifest.json in Task 5 commit.

const MANIFEST = [
  { file: "Inter-Regular.ttf", url: "https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf" },
  // … map each file from FONT_CATALOG to google/fonts raw URL
];

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const { file, url } of MANIFEST) {
    const dest = path.join(outDir, file);
    if (fs.existsSync(dest)) {
      console.log("skip", file);
      continue;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed ${file}: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    console.log("ok", file);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
```

**Implementer note:** Google Fonts static paths vary per family — verify each URL returns `font/ttf`. Alternative: use [google-webfonts-helper](https://gwfh.mranftl.com/fonts) API or npm `google-fonts-helper`. Manifest phải liệt kê **đủ file** khớp `font-catalog.ts`.

- [ ] **Step 2: Root package.json**

```json
"scripts": {
  "fetch:fonts": "node scripts/fetch-brand-fonts.mjs"
}
```

- [ ] **Step 3: Cập nhật README**

Ghi: chạy `pnpm fetch:fonts`, chuỗi test VN, bản quyền OFL, tier A ship bắt buộc trong release.

- [ ] **Step 4: Chạy script (mạng)**

Run: `pnpm fetch:fonts`
Expected: tải file vào `data/brand/fonts/` (có thể skip file đã có)

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-brand-fonts.mjs package.json data/brand/fonts/README.md
git commit -m "chore: add fetch-brand-fonts script for Vietnamese catalog"
```

*(Font binaries: commit tier A nếu kích thước repo cho phép; nếu không — `.gitignore` local và document bắt buộc chạy script sau clone.)*

---

## Task 7: Font Combobox searchable + tier badge

**Files:**
- Modify: `apps/desktop/src/features/editor/PropertiesPanel.tsx`

- [ ] **Step 1: Thay Select font bằng Combobox**

```tsx
import { Combobox, InputBase, Text, useCombobox } from "@mantine/core";
import { availableFamilies, getFontPreviewStyle } from "../../lib/fonts.js";

// trong accordion Văn bản:
const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });
const families = availableFamilies();
const cur = (t.fontFamily as string) ?? "Be Vietnam Pro";

<Combobox
  store={combobox}
  onOptionSubmit={(v) => {
    up({ fontFamily: v });
    combobox.closeDropdown();
  }}
>
  <Combobox.Target>
    <InputBase
      label="Font"
      component="button"
      type="button"
      pointer
      rightSection={<Combobox.Chevron />}
      onClick={() => combobox.toggleDropdown()}
      rightSectionPointerEvents="none"
    >
      <Text style={getFontPreviewStyle(cur)} size="sm">
        {cur}
      </Text>
    </InputBase>
  </Combobox.Target>
  <Combobox.Dropdown>
    <Combobox.Search placeholder="Tìm font…" />
    <Combobox.Options>
      {families.map((f) => (
        <Combobox.Option value={f.value} key={f.value}>
          <Group justify="space-between" wrap="nowrap">
            <Text style={getFontPreviewStyle(f.value)} size="sm">
              {f.label}
            </Text>
            <Badge size="xs" variant="light" color={f.tier === "C" ? "orange" : "gray"}>
              {f.tier}
            </Badge>
          </Group>
        </Combobox.Option>
      ))}
    </Combobox.Options>
  </Combobox.Dropdown>
</Combobox>
```

Tier C: thêm `Tooltip` *"Nên dùng cho cụm ngắn"* trên Badge.

- [ ] **Step 2: Sau đổi font — đảm bảo render**

```tsx
onOptionSubmit={async (v) => {
  up({ fontFamily: v });
  try {
    await document.fonts.load(`16px "${v}"`);
  } catch { /* */ }
  ed.getCanvas()?.requestRenderAll();
  combobox.closeDropdown();
}}
```

- [ ] **Step 3: Verify + commit**

```bash
pnpm --filter @genposter/desktop typecheck
pnpm --filter @genposter/desktop build
git commit -m "feat(editor): searchable font combobox with tier badge and preview"
```

---

## Task 8: Kiểm thử thủ công end-to-end

- [ ] **Step 1: Layout**

1. `pnpm dev` → Thiết kế → mở mẫu.
2. Toolbar không có menu Thêm; thêm text qua panel trái tab Thêm.
3. Chọn object → ContextBar hiện; thử căn trái, xóa, nhân bản.
4. Rail phải → Inspector mở overlay; canvas không co; Esc đóng.
5. Đổi tab trái sang Lớp → thoát app → vào lại → tab vẫn Lớp.
6. Đổi trang, Lưu, về Trang tổng — không lỗi.

- [ ] **Step 2: Font**

1. `pnpm fetch:fonts` (nếu chưa có file).
2. Dropdown font ≥ 30 mục (mục tiêu 40+).
3. Gõ chuỗi test: `ÁàẢãẠăằâđÊềỗƠưữ` với Noto Sans, Inter, Be Vietnam Pro.
4. Lưu → thumbnail cập nhật đúng font.
5. Tab Tạo ảnh → chọn trang → xuất thử 1 ảnh — font khớp.

- [ ] **Step 3: Commit checkpoint (nếu có fix nhỏ)**

```bash
git commit -m "fix(editor): address manual QA from layout+fonts rollout"
```

---

## Spec Coverage Checklist

| Spec § | Task |
|--------|------|
| 4.1 Grid 240/1fr/44 | Task 1 |
| 4.2 Toolbar gọn, gỡ Thêm | Task 1 |
| 4.3 Left tab persist | Task 4 |
| 4.4 ContextBar | Task 2 |
| 4.5 Inspector overlay + rail | Task 3 |
| 4.6 Page strip unchanged | — |
| 5.2–5.3 Font catalog 48 family | Task 5–6 |
| 5.4 Combobox preview | Task 7 |
| 7 Kiểm thử | Task 8 |

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-24-editor-layout-fonts.md`.

**Hai cách triển khai:**

1. **Subagent-Driven (khuyến nghị)** — mỗi task một subagent, review giữa các task.
2. **Inline Execution** — làm liên tục trong session này với checkpoint sau mỗi task.

Bạn chọn cách nào?
