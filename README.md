# Genposter V3

Content factory for Da Lat travel content: turn the `F&B ĐÀ LẠT` Excel database +
the local photo library into batches of TikTok carousel images. Few operators,
high output.

Brand: Riviu orange `#ff6600`.

## Architecture (short)

```
Excel (data/database/fnb_dalat.xlsx)  +  Photos (data/photos/<group>/<place>/*)
        |                                         |
        v                                         v
   services/data-api  (Python / FastAPI)  --> builds slide data JSON
        |
        v
   services/render    (Node)  --> binds template + data -> JPG into output/
        ^
        |
   templates/*.json   (authored in apps/desktop Polotno editor / Genposter schema)
```

See [docs/architecture.md](docs/architecture.md) for detail.

## Repo layout

- `data/` consolidated data (see `data/mapping.yaml`)
  - `database/fnb_dalat.xlsx`, `photos/<group>/`, `templates_ref/<series>/`, `brand/`
- `apps/desktop/` Tauri 2 + React desktop app (Design / Data / Produce / Jobs tabs)
- `services/data-api/` Python FastAPI: read Excel, resolve photos, paginate slides
- `services/render/` Node renderer + lightweight SQLite job queue
- `packages/theme/` shared brand tokens (`#ff6600`) for app + templates
- `packages/template-schema/` shared TypeScript types (templates, recipes, slides)
- `templates/` saved templates (JSON)
- `recipes/` batch presets (YAML)
- `output/` generated images

## Prerequisites

- Node >= 20 and pnpm (`npm i -g pnpm`)
- Python >= 3.11
- Rust + Cargo (only for building the Tauri desktop app)

## Setup

```bash
# JS workspaces
pnpm install

# Python data-api
cd services/data-api
python -m venv .venv
.venv\Scripts\activate        # Windows (PowerShell: .venv\Scripts\Activate.ps1)
pip install -r requirements.txt
```

## Run the end-to-end smoke test (no servers, no Polotno key needed)

```bash
pnpm smoke
```

This builds slides for the sample recipe `recipes/todo_list_an_toi.yaml` and
renders JPGs into `output/` using the built-in renderer.

## Run (recommended — starts data-api + render + desktop app)

```bash
pnpm dev
# or
pnpm app:tauri
```

This launches:
- **data-api** on `http://127.0.0.1:8756` (Excel + templates)
- **render** on `http://127.0.0.1:8777` (batch JPG export)
- **Tauri desktop app** with tabs Sản xuất / Dữ liệu / **Thiết kế** / Lịch sử

Sidecars only (without opening the app):

```bash
pnpm sidecars
```

## Adding a new template

1. Design in the Design tab (Polotno) or copy an existing `templates/*.json`.
2. Mark dynamic text with `{{field}}` and image slots with a `bind` key.
3. Add a recipe in `recipes/` pointing at the sheet + template.
4. Preview a slide, then batch.

## Notes

- `data/photos/` (~7400 images) is git-ignored; keep it locally.
- Polotno SDK requires a commercial license key (`POLOTNO_KEY`) for the editor
  and for `polotno-node` rendering. The built-in renderer works without it.
