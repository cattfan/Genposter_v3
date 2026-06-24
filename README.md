# Genposter V3

Single desktop app (Tauri 2 + React + Vite + TypeScript) that turns an Excel
database + a local photo library into batches of TikTok-carousel JPGs.

- **Tab Thiết kế (Design)** — a Fabric.js editor (text, images, shapes, layers,
  align/distribute, order, lock/hide, undo/redo, flip, background, data-field
  slots). Saves pure layout templates to `templates/*.json`.
- **Tab Tạo ảnh (Produce)** — pick a template, map each object to a data source
  (sheet field / title / photo / static / AI), then render every slide in-app
  with Fabric (WYSIWYG) to `output/`. Presets are saved to `recipes/*.yaml`,
  fully separate from templates.

## Architecture

```
apps/desktop        Tauri app (all UI, editor, data, render)
  src/lib           excel (SheetJS), mapping (yaml), photos, fonts,
                    bind, build, render (Fabric -> JPG), template/recipe IO
  src/features      editor/ (Tab 1), produce/ (Tab 2), settings/
  src-tauri         Rust shell (fs + dialog + shell plugins only)
packages/schema     shared TypeScript contracts (Template/Recipe/Slide/Binding)
data/               mapping.yaml, database/*.xlsx, photos/<group>/, brand/fonts/
templates/ recipes/ output/
```

No Python/Node sidecars. Excel is read with SheetJS, files via the Tauri fs
plugin, photos scanned via the fs plugin, rendering via Fabric `StaticCanvas`.

## Prerequisites

- Node 20+, pnpm 9+
- Rust toolchain + the Tauri 2 system deps (WebView2 on Windows — already
  present if you've run a Tauri app before).

## Setup

```bash
pnpm install
```

### One-time: app icons (required by Tauri build)

Tauri needs icons referenced in `apps/desktop/src-tauri/tauri.conf.json`.
Generate them from any square PNG (≥512px):

```bash
pnpm --filter @genposter/desktop tauri icon path/to/logo.png
```

This writes `src-tauri/icons/*` (32x32.png, 128x128.png, icon.ico, …).

### Restore source data (lost when the project was deleted)

- `data/database/fnb_dalat.xlsx` — the Excel database (sheets per `mapping.yaml`).
- `data/photos/<group>/` — the 9 photo groups listed in `mapping.yaml`
  (`quan_an`, `cafe`, `homestay`, `check_in`, `khu_du_lich`, `dich_vu`,
  `choi_dem`, `hoat_dong`, `hinh_nen`).
- `data/brand/fonts/` — optional Be Vietnam Pro `.ttf` (Vietnamese-complete):
  `BeVietnamPro-Regular.ttf`, `-Medium.ttf`, `-SemiBold.ttf`, `-Bold.ttf`,
  `-Italic.ttf`. Montserrat (Bold/ExtraBold) is already present for headings.

If the project root isn't `C:/Users/cattfan/Desktop/Genposter_V3`, set it in the
app via the ⚙ Settings dialog.

## Run

```bash
pnpm dev        # tauri dev (desktop window)
# or, browser-only UI preview (no fs/render): pnpm web
```

## Build

```bash
pnpm build      # tauri build (installer in src-tauri/target/release/bundle)
```

## Photo matching

`src/lib/photos.ts` resolves photos per item heuristically: by sub-folder name,
then by filename containing the item's `photo_key` (`Link_drive`) or name, then a
deterministic fallback slice. Adjust there if your library is organized
differently.

## AI text (optional)

A binding token `ai:<prompt>` is supported. Prompts may use `{{item.name}}`,
`{{item.desc}}`, `{{title}}`, etc. Configure an OpenAI-compatible Base URL + API
key + model in ⚙ Settings. With no key, AI bindings render empty (the rest works
unchanged).
