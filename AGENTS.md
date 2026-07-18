 # Genposter V3 — tài liệu cho Agent & máy mới

File này là **nguồn sự thật vận hành** của repo: kiến trúc, data, server, lệnh chạy, setup máy mới. Cursor / Agent trên máy khác đọc file này trước khi đụng code.

---

## Quy định cập nhật (bắt buộc)

Mỗi khi Agent / người sửa một trong các hạng mục sau, **phải cập nhật `AGENTS.md` trong cùng commit** (thêm dòng vào Nhật ký thay đổi + sửa nội dung liên quan):

- URL / địa chỉ server (LAN, Tailscale, public), `base_id`, tỉnh mặc định
- Schema dữ liệu: sheet mới, cột mới trong Sheets / NocoDB, thay đổi `data/mapping.yaml`
- Luồng sync / import / cache / produce đọc data
- Lệnh build/dev đổi, cấu trúc thư mục lớn, first-run / settings mặc định
- Trạng thái server (bật / tắt / đổi máy chủ) — ghi ngày trong bảng Server

Không ghi mật khẩu / API token vào file này. Bí mật chỉ nằm trong `deploy/CREDENTIALS.local.md` (đã gitignore).

---

## Tổng quan

Genposter V3 là app desktop (Tauri 2 + React + Vite + TypeScript + Fabric.js) tạo hàng loạt ảnh carousel TikTok từ dữ liệu quán Đà Lạt + ảnh.

| Tab | Việc |
|---|---|
| **Thiết kế** | Editor Fabric: text, hình, ảnh, layers, data groups, autosave → `templates/*.json` |
| **Tạo ảnh** | Chọn khuôn, bind field/ảnh/AI, lọc sheet, sinh JPG → `output/` + preset `recipes/*.yaml` |
| **Dữ liệu** | Sync / xem cache NocoDB, trạng thái stale |
| **Cài đặt** | Thư mục dự án, URL server, AI API |

Monorepo:

```
apps/desktop/          UI + editor + sync + render (Tauri)
  src/features/        editor/, produce/, data/, settings/
  src/lib/             sync, server-api, bind, render, mapping, settings…
  src-tauri/           Rust shell, capabilities, CSP
packages/schema/       TypeScript contracts (TemplateSet, Recipe, DataRow…)
data/                  mapping.yaml, cache/, photos/, brand/fonts/
templates/ recipes/ output/
deploy/                NocoDB Docker, scripts admin, docs mạng
```

---

## Lệnh chuẩn

Từ root repo (Windows PowerShell OK):

```powershell
pnpm install
pnpm dev                    # tauri dev — cửa sổ desktop
pnpm build                  # installer release
```

Trong `apps/desktop`:

```powershell
pnpm test                   # vitest
pnpm typecheck              # tsc --noEmit
```

Cần Node 20+, pnpm 9+, Rust + WebView2 (Windows).

---

## Nguồn dữ liệu

### Google Sheets (source of truth biên tập — 2026-07)

https://docs.google.com/spreadsheets/d/1-ECVLtuySSlCO5AShcJle1uP9j8XCA4l/edit

10 sheet (tên giữ nguyên, ~940–1000 dòng mỗi sheet chính):

`Quan_an`, `Cafe`, `Homestay`, `Hoat_dong`, `Check_in`, `Khu_du_lich`, `Dich_vu`, `Choi_đem`, `Hinh_nen`, `Luu_y`

**Cột mới (2026-07 review):**

| Sheet | Header thật | Canonical trong mapping | Giá trị |
|---|---|---|---|
| Quan_an | `phan_loai` | `category` | `Local` / `Du lịch` |
| Cafe | `Phan_loai` | `category` | `Local` / `Du lịch` |

Cột QA app bỏ qua: `Người Fix`, `Người fix`, `Check lại`, `STT`.

Mapping chuẩn: [`data/mapping.yaml`](data/mapping.yaml).

### NocoDB (server sync khi online)

App **không đọc Sheets trực tiếp**. Luồng chuẩn:

```
Google Sheets
  → deploy/import-to-nocodb.mjs (khi import lại)
  → NocoDB (base Riviu Đà Lạt)
  → app sync (tab Dữ liệu)
  → data/cache/<tỉnh>/index.json + photos/
  → tab Tạo ảnh đọc cache (offline OK sau khi sync)
```

Filter publish: chỉ dòng `Trang_thai = Da_duyet` và `Tinh = dalat` (mặc định).

---

## Server NocoDB

Chi tiết vận hành / invite user / backup: [`deploy/README.md`](deploy/README.md), [`deploy/TAILSCALE.md`](deploy/TAILSCALE.md), [`deploy/PORT-FORWARD.md`](deploy/PORT-FORWARD.md).

**Bàn giao người mới:** [`deploy/HANDOVER.md`](deploy/HANDOVER.md) — checklist setup, ba môi trường server, Local Docker / LAN / Tailscale, bí mật & ngày 1.

| Kênh | URL | Ghi chú |
|---|---|---|
| **Local Docker (đang dùng tạm)** | `http://localhost:8080` | Máy này, `deploy/docker-compose.yml` |
| LAN (công ty) | `http://192.168.110.101:8080` | Offline (2026-07) |
| Tailscale | `http://100.74.131.110:8080` | Offline cùng LAN |
| Public (port-forward) | `http://1.52.185.91:8080` | Offline |

| Mục | Giá trị (Local Docker) |
|---|---|
| `base_id` | `puzatkuv7t0p8ut` |
| Tỉnh mặc định | `dalat` |
| Defaults trong code | [`apps/desktop/src/lib/settings.ts`](apps/desktop/src/lib/settings.ts) (`NC_LOCAL_URL`) |
| Token / mật khẩu | **chỉ** `deploy/CREDENTIALS.local.md` (local, không commit) |

**Trạng thái (2026-07-18):** đang chạy **Local Docker** trên máy dev. Sheets → NocoDB **full** (634 dòng `Da_duyet` + **7398** ảnh đính kèm; 25 dòng không khớp folder ảnh). Cache app `data/cache/dalat/` đã sync cùng ngày. LAN/Tailscale vẫn tắt.

### Local Docker — lệnh nhanh

```powershell
cd deploy
docker compose --env-file .env up -d          # bật
docker compose --env-file .env ps             # trạng thái
docker compose --env-file .env down           # tắt (giữ volume)
```

Import full (text + ảnh) rồi sync cache:

```powershell
$env:NC_URL="http://localhost:8080"
$env:NC_BASE_ID="puzatkuv7t0p8ut"
$env:GP_ADMIN_EMAIL="admin@genposter.vn"
$env:GP_ADMIN_PW="..."   # xem CREDENTIALS.local.md
node deploy/wipe-table-records.mjs            # xóa record cũ (giữ schema)
Remove-Item deploy/import-state.local.json -ErrorAction SilentlyContinue
node deploy/import-to-nocodb.mjs              # full — không --skip-photos
$env:NC_TOKEN="..."                           # app xc-token
node deploy/sync-cache.mjs                    # → data/cache/dalat/
```

App: tab Cài đặt → URL `http://localhost:8080` + base id + token từ CREDENTIALS → Lưu → tab Dữ liệu → Sync (hoặc dùng `sync-cache.mjs` ở trên).

Scripts hữu ích trong `deploy/`: `check-server.mjs`, `import-to-nocodb.mjs`, `wipe-table-records.mjs`, `sync-cache.mjs`, `create-team-user.mjs`, `setup-nocodb.mjs`, `lock-signup.mjs`.

---

## Setup máy mới

1. Clone repo, `pnpm install`
2. Copy / tạo `deploy/CREDENTIALS.local.md` từ máy cũ (không có trên GitHub)
3. `pnpm dev` → lần đầu app hiện **Chọn thư mục dự án** → trỏ vào thư mục clone (chứa `templates/`, `data/`, …)
4. Cài [Tailscale](https://tailscale.com/download), đăng nhập cùng tài khoản Google trong CREDENTIALS / `deploy/TAILSCALE.md`
5. Tab **Cài đặt**: URL Tailscale + LAN (đã default), dán `xc-token` app sync, base id
6. Tab **Dữ liệu** → Sync khi server online
7. Font brand: `data/brand/fonts/` (xem README trong thư mục đó)

`rootDir` **không** hardcode path máy cũ — bắt buộc chọn trên mỗi máy.

---

## File / vùng quan trọng

| Path | Vai trò |
|---|---|
| `apps/desktop/src/features/editor/` | Editor: `useEditor`, `DesignWorkspace`, panels |
| `apps/desktop/src/features/produce/` | Khuôn, bind, sinh ảnh |
| `apps/desktop/src/lib/sync.ts` | Sync NocoDB → cache |
| `apps/desktop/src/lib/server-api.ts` | HTTP NocoDB (timeout, probe URL) |
| `apps/desktop/src/lib/render.ts` | Fabric → JPG / zip |
| `apps/desktop/src/lib/settings.ts` | Defaults server + AI + rootDir |
| `apps/desktop/src-tauri/capabilities/default.json` | fs scope `$HOME/**`, deny DevTools release |
| `apps/desktop/src-tauri/tauri.conf.json` | CSP, asset protocol |
| `templates/` | Template JSON (thiết kế) |
| `recipes/` | Recipe YAML (produce presets) |
| `data/cache/` | Cache sync (gitignore) |
| `output/` | Ảnh xuất (gitignore) |

---

## Nhật ký thay đổi

| Ngày | Việc |
|---|---|
| 2026-07-18 | HANDOVER.md v2: gói bàn giao vật lý (photos 9.6GB), cảnh báo base LAN chứa data cũ + quy trình wipe/import khi bật lại, troubleshooting, danh sách 25 dòng thiếu ảnh, bảng "Ai giữ gì", định hướng hạ tầng |
| 2026-07-18 | Thêm [`deploy/HANDOVER.md`](deploy/HANDOVER.md) — hướng dẫn bàn giao vận hành (Local Docker / LAN / Tailscale) |
| 2026-07-18 | Local Docker: import **full** 634 dòng + 7398 ảnh; sync cache `dalat`; thêm `wipe-table-records.mjs` / `sync-cache.mjs` |
| 2026-07-18 | Kéo Sheets → `data/database/fnb_dalat.xlsx`; bật NocoDB Local Docker `:8080`; setup base `puzatkuv7t0p8ut`; default app → localhost |
| 2026-07-16 | Review Google Sheets: thêm `category` ← `phan_loai`/`Phan_loai` vào mapping; server ghi **đang tắt**; tạo `AGENTS.md` |
| 2026-07-09 | Harden editor (autosave debounce, undo queue, clipOnly, design data-preview); khóa signup provision; first-run rootDir |
| 2026-07-03 | Tailscale `100.74.131.110`; docs PORT-FORWARD |
| 2026-07-02 | Chuyển server chính sang LAN `192.168.110.101`, base `pcq7mr8crku2d9o`; VPS cũ `180.93.114.89` ngừng dùng |

*(Agent: thêm dòng mới ở đầu bảng khi sửa lớn.)*
