# Genposter V3 — Hướng dẫn bàn giao vận hành

Tài liệu này dành cho người **tiếp quản** dự án (dev + server dữ liệu). Đọc hết trước khi sửa server hoặc đổi URL trong app.

**Ngày chốt trạng thái:** 2026-07-18

**Bí mật:** mọi mật khẩu / API token / SSH password chỉ nằm trong `deploy/CREDENTIALS.local.md` (local, đã gitignore). **Không** copy giá trị thật vào chat, PR, hay file docs public. File này chỉ nêu *loại* credential cần gì và trỏ bạn đọc CREDENTIALS.

Nguồn sự thật song song (cập nhật thường xuyên hơn code):

| File | Nội dung |
|---|---|
| [`AGENTS.md`](../AGENTS.md) | Kiến trúc, lệnh, trạng thái server ngắn, nhật ký thay đổi |
| [`deploy/README.md`](README.md) | NocoDB: invite user, backup, scripts |
| [`deploy/TAILSCALE.md`](TAILSCALE.md) | VPN Tailscale vào server LAN |
| [`deploy/PORT-FORWARD.md`](PORT-FORWARD.md) | Public port-forward (kém an toàn) |
| [`data/mapping.yaml`](../data/mapping.yaml) | Sheets → field canonical + photo groups |

---

## 1. Tổng quan sản phẩm

**Genposter V3** là app desktop (Tauri 2 + React + Vite + TypeScript + Fabric.js) tạo hàng loạt ảnh carousel TikTok từ dữ liệu quán / địa điểm Đà Lạt + ảnh.

| Tab | Việc |
|---|---|
| **Thiết kế** | Editor Fabric: text, hình, ảnh, layers, data groups; autosave → `templates/*.json` |
| **Tạo ảnh** | Chọn khuôn, bind field/ảnh/AI, lọc sheet, sinh JPG → `output/` + preset `recipes/*.yaml` |
| **Dữ liệu** | Sync / xem cache NocoDB, trạng thái stale |
| **Cài đặt** | Thư mục dự án (`rootDir`), URL server, AI API |

Monorepo (rút gọn):

```
apps/desktop/       UI + editor + sync + render (Tauri)
packages/schema/    TypeScript contracts
data/               mapping.yaml, cache/, photos/, brand/fonts/
templates/          Template JSON
recipes/            Recipe YAML
output/             Ảnh xuất (gitignore)
deploy/             NocoDB Docker, scripts admin, docs mạng
```

---

## 2. Setup máy mới (dev)

### Yêu cầu

- Node **20+**, pnpm **9+**
- Rust + WebView2 (Windows)
- Docker Desktop (nếu chạy **Local Docker** trên máy này)
- (Khuyến nghị) Tailscale — xem mục 8

### Bước

```powershell
# Từ root repo
pnpm install
pnpm fetch:fonts          # font brand → data/brand/fonts/ (nếu thiếu)
pnpm dev                  # cửa sổ Tauri
```

Lệnh hữu ích khác:

```powershell
pnpm build                # installer release
cd apps/desktop
pnpm test                 # vitest
pnpm typecheck            # tsc --noEmit
```

Bản cài cho người **không code** (chỉ dùng app): `pnpm build` → installer nằm trong `apps/desktop/src-tauri/target/release/bundle/` — gửi file cài đó, máy người nhận không cần Node/Rust. Họ vẫn cần bản copy thư mục dự án (`templates/`, `data/`…) và chọn `rootDir` lần đầu mở app.

### First-run

1. Lần đầu app hiện **Chọn thư mục dự án** → trỏ vào thư mục clone (phải chứa `templates/`, `data/`, …).
2. `rootDir` **không** hardcode path máy cũ — mỗi máy chọn lại.
3. Copy `deploy/CREDENTIALS.local.md` từ máy người bàn giao (file **không** có trên GitHub).
4. Tab **Cài đặt**: dán URL / base id / `xc-token` theo mục đang dùng (hiện tại: Local Docker — mục 5–6, 9).
5. Tab **Dữ liệu** → Sync khi server online (hoặc chạy `deploy/sync-cache.mjs`).

Font: xem `data/brand/fonts/README.md` và `pnpm fetch:fonts`.

---

## 3. Nguồn dữ liệu

### Google Sheets (biên tập — source of truth nội dung)

https://docs.google.com/spreadsheets/d/1-ECVLtuySSlCO5AShcJle1uP9j8XCA4l/edit

10 sheet (tên giữ nguyên):

`Quan_an`, `Cafe`, `Homestay`, `Hoat_dong`, `Check_in`, `Khu_du_lich`, `Dich_vu`, `Choi_đem`, `Hinh_nen`, `Luu_y`

File Excel làm việc local / import: `data/database/fnb_dalat.xlsx` (mapping trỏ tới đây).

**Cách tải Sheets → xlsx (bước tay, dễ quên):** mở link Sheets → **File → Tải xuống → Microsoft Excel (.xlsx)** → ghi đè `data/database/fnb_dalat.xlsx`. Giữ nguyên tên 10 sheet — import và mapping match theo tên sheet. Ai giữ quyền edit Sheets: điền bảng **Ai giữ gì** (mục Checklist).

Cột QA app bỏ qua: `Người Fix`, `Người fix`, `Check lại`, `STT`.

Cột category (2026-07): `Quan_an.phan_loai` / `Cafe.Phan_loai` → canonical `category` (`Local` / `Du lịch`). Chi tiết field map: `data/mapping.yaml`.

### Luồng chuẩn

App **không** đọc Sheets trực tiếp:

```
Google Sheets
  → tải / cập nhật data/database/fnb_dalat.xlsx
  → deploy/import-to-nocodb.mjs
  → NocoDB (base Riviu Đà Lạt / Genposter Data)
  → app sync (tab Dữ liệu) hoặc deploy/sync-cache.mjs
  → data/cache/<tỉnh>/index.json + photos/
  → tab Tạo ảnh đọc cache (offline OK sau khi sync)
```

**Filter publish:** chỉ dòng `Trang_thai = Da_duyet` và `Tinh = dalat` (mặc định trong app).

Trong NocoDB mỗi bảng còn cột:

- `Anh` — attachment (thứ tự ảnh = thứ tự dùng trong khuôn)
- `Trang_thai` — `Nhap` / `Da_duyet` / `Xoa` (đổi sang `Xoa` thay vì xoá cứng)
- `Tinh` — hiện `dalat`

---

## 4. Ba môi trường server (so sánh)

| | Local Docker (đang dùng tạm) | LAN công ty | Tailscale | Public port-forward |
|---|---|---|---|---|
| **URL** | `http://localhost:8080` | `http://192.168.110.101:8080` | `http://100.74.131.110:8080` | `http://1.52.185.91:8080` |
| **Máy** | Máy dev (Docker Desktop) | Ubuntu tại công ty | Cùng máy LAN, hostname `genposter-lan` | Cùng máy LAN qua router |
| **base_id** | `puzatkuv7t0p8ut` | `pcq7mr8crku2d9o` | (cùng base LAN) | (cùng base LAN) |
| **SSH** | không (local) | `riviu@192.168.110.101` | `riviu@100.74.131.110` | — |
| **Stack Docker** | repo `deploy/docker-compose.yml` | `/opt/genposter` trên server | cùng LAN | cùng LAN |
| **Khi nào dùng** | Server công ty tắt / làm offline trên máy mình | Trong mạng công ty, nhanh | Từ nhà / ngoài LAN, an toàn hơn public | Chỉ khi bất khả kháng |
| **Trạng thái 2026-07-18** | **Online**, đã import full | **Offline** (máy tắt nguồn) | **Offline** (cùng máy) | Offline / không khuyến nghị |

Defaults trong code (`apps/desktop/src/lib/settings.ts`):

- `NC_LOCAL_URL` = `http://localhost:8080`
- `NC_LAN_URL` = `http://192.168.110.101:8080`
- `NC_TAILSCALE_URL` = `http://100.74.131.110:8080`
- Default app hiện tại: URL + `lanUrl` → Local Docker; `baseId` → `puzatkuv7t0p8ut`; tỉnh → `dalat`

**VPS cũ** `180.93.114.89` — **ngừng dùng** (giữ trong CREDENTIALS để tham chiếu lịch sử thôi).

---

## 5. Trạng thái hiện tại (2026-07-18)

- Đang chạy **Local Docker** trên máy dev: NocoDB `http://localhost:8080`, base `puzatkuv7t0p8ut`.
- Import **full** từ Sheets/xlsx: **634** dòng `Da_duyet` + **7398** ảnh đính kèm; **25 dòng không khớp folder ảnh** — danh sách chép lại ở dưới (report gốc `deploy/import-report.local.md` là file local, đổi máy sẽ mất).
- Cache app `data/cache/dalat/` đã sync cùng ngày.
- **LAN + Tailscale offline** khoảng vài ngày vì **máy server công ty tắt nguồn** — không phải chỉ mất Tailscale/VPN.
- Docs **không** mô tả Wake-on-LAN / remote power-on: muốn bật lại phải **có người tại chỗ bật nguồn máy**.

### 25 dòng chưa có ảnh (import 2026-07-18)

Nguyên nhân: tên folder trong `data/photos/<nhóm>/` không khớp `photo_key` / tên quán (matching bỏ dấu, lowercase, so substring).

| Sheet | Dòng Excel | Quán |
|---|---|---|
| Quan_an | 147 | 146. FUJIYA |
| Quan_an | 148 | 147. Hana Izakaya |
| Quan_an | 149 | 148. Bếp thông |
| Quan_an | 150–151 | 149. Tầm Bóp Lẩu Nướng (2 dòng) |
| Quan_an | 152 | 150. D'Lart Garden |
| Quan_an | 153 | 152. Tiệm ăn vặt trà sữa Béo |
| Quan_an | 155 | 154. Tiệm tô mì |
| Quan_an | 156 | 156. Bún bò Huế Hương |
| Quan_an | 157 | 156. Phở Uyên |
| Cafe | 16 | 15. Tiệm Cà Phê Chênh Vênh |
| Cafe | 104 | 103. allinB cafe |
| Cafe | 108 | 107. Caffe bà năm |
| Cafe | 116 | 115. KẺNG coffee & campsite (tên gốc dùng ký tự Unicode đặc biệt) |
| Cafe | 118 | 117. D'Lart Garden |
| Homestay | 52 | 51. Hanna Villa |
| Homestay | 53–55 | 52–54. Nhà An 1 / 2 / 3 |
| Homestay | 56 | 55. Clould View Glamping |
| Check_in | 75 | 74. Chùa Tàu |
| Khu_du_lich | 39 | 41. Pink Valley |
| Dich_vu | 30 | 29. ATZ Organic |
| Choi_đem | 24 | 23. Tháp Vinaphone |
| Hoat_dong | 22 | 21. Show Dalat 5AM |

Cách sửa (chọn 1):

1. **Ít quán — khuyên dùng:** mở NocoDB → bảng tương ứng → kéo thả ảnh vào cột `Anh` của dòng đó → app Sync lại.
2. **Sửa tận gốc:** tạo / đổi tên folder trong `data/photos/<nhóm>/` cho chứa tên quán (không dấu vẫn khớp), rồi **wipe + import full lại** (mục 6). Lưu ý: chỉ chạy lại `--sheet X` không đủ — import có state resume, dòng đã tạo sẽ bị bỏ qua.

### Khi bật lại server LAN

1. **Power on** máy vật lý tại công ty (`192.168.110.101`).
2. SSH: `ssh riviu@192.168.110.101` (mật khẩu trong CREDENTIALS).
3. Tailscale: `sudo tailscale up` rồi `sudo tailscale status` — kỳ vọng IP `100.74.131.110`.
4. Docker stack:

```bash
cd /opt/genposter
docker compose ps
# nếu nocodb/postgres không chạy:
docker compose up -d
```

5. Health: `curl http://127.0.0.1:8080/api/v1/health` trên server, hoặc từ máy đã join Tailscale mở `http://100.74.131.110:8080`.

> **CẢNH BÁO — dữ liệu trên base LAN đã CŨ.** Base `pcq7mr8crku2d9o` đóng băng từ trước 2026-07: thiếu cột `category`, thiếu toàn bộ đợt refresh Sheets 07-2026. **Đừng** trỏ app sang rồi Sync ngay — cache mới trên máy sẽ bị đè bằng dữ liệu cũ.

6. Làm mới dữ liệu LAN trước (từ máy dev có xlsx + `data/photos/` mới nhất; backup dump trên server trước — mục 7):

```powershell
$env:NC_URL="http://100.74.131.110:8080"    # hoặc http://192.168.110.101:8080
$env:NC_BASE_ID="pcq7mr8crku2d9o"
$env:GP_ADMIN_EMAIL="..."                   # admin LAN — CREDENTIALS
$env:GP_ADMIN_PW="..."
node deploy/wipe-table-records.mjs
Remove-Item deploy/import-state.local.json -ErrorAction SilentlyContinue
node deploy/import-to-nocodb.mjs            # full text + ảnh (chậm hơn localhost)
$env:NC_APP_TOKEN="..."                     # xc-token LAN
node deploy/verify-import.mjs               # đối chiếu số dòng vs Excel
```

7. Verify OK rồi mới đổi app: URL chính → Tailscale (hoặc LAN nếu ở công ty), Base ID → `pcq7mr8crku2d9o`, token LAN → Test server → Sync.

---

## 6. Local Docker — vận hành

Stack: PostgreSQL 16 + NocoDB (`deploy/docker-compose.yml`). Secrets compose: `deploy/.env` (gitignore; biến chính `PG_PASSWORD`, `NC_PUBLIC_URL`, `NC_INVITE_ONLY_SIGNUP`).

### Start / stop

```powershell
cd deploy
docker compose --env-file .env up -d          # bật
docker compose --env-file .env ps             # trạng thái
docker compose --env-file .env logs -f nocodb
docker compose --env-file .env down           # tắt (giữ volume dữ liệu)
```

Mở UI: http://localhost:8080

### Credential cần (xem CREDENTIALS — mục LOCAL DOCKER)

| Loại | Ví dụ role / chỗ dùng |
|---|---|
| Admin NocoDB | email admin + mật khẩu (`GP_ADMIN_*`) — setup / wipe / import |
| Editor | acc nhập liệu |
| App sync | Viewer + **`xc-token` read-only** dán vào app |
| Postgres | user/password trong `deploy/.env` (chỉ trong Docker network) |
| `base_id` | Local Docker ≠ LAN — đừng lẫn |

### Setup base lần đầu (máy mới / volume trống)

```powershell
# Sau khi compose up -d và NocoDB trả health OK
$env:NC_URL="http://localhost:8080"
$env:GP_ADMIN_PW="..."      # CREDENTIALS
$env:GP_EDITOR_PW="..."
$env:GP_SYNC_PW="..."
node deploy/setup-nocodb.mjs
# Ghi lại base_id + xc-token mà script in ra → cập nhật CREDENTIALS.local.md
```

### Wipe + import full + sync cache

```powershell
$env:NC_URL="http://localhost:8080"
$env:NC_BASE_ID="puzatkuv7t0p8ut"
$env:GP_ADMIN_EMAIL="admin@genposter.vn"
$env:GP_ADMIN_PW="..."      # CREDENTIALS

node deploy/wipe-table-records.mjs            # xoá record, giữ schema
Remove-Item deploy/import-state.local.json -ErrorAction SilentlyContinue
node deploy/import-to-nocodb.mjs              # full text + ảnh (lâu)
# Nhanh chỉ text: node deploy/import-to-nocodb.mjs --skip-photos

$env:NC_TOKEN="..."                           # xc-token Local Docker
node deploy/sync-cache.mjs                    # → data/cache/dalat/
```

Health check nhanh:

```powershell
$env:NC_URL="http://localhost:8080"
$env:NC_BASE_ID="puzatkuv7t0p8ut"
$env:NC_APP_TOKEN="..."                       # cùng xc-token app
node deploy/check-server.mjs
```

Import resumable qua `deploy/import-state.local.json`; báo cáo `deploy/import-report.local.md` (cả hai gitignore theo `deploy/*.local.*`).

### Backup Local Docker? — Không cần, stack này là disposable

Source of truth = Google Sheets (nội dung) + `data/photos/` (ảnh gốc, **9.6 GB**) + `data/database/fnb_dalat.xlsx`. Mất volume Docker (reset Docker Desktop, xoá stack) → chạy lại `setup-nocodb.mjs` + wipe/import ở trên (~15–30 phút). Thứ duy nhất phải giữ chắc: **`data/photos/` + CREDENTIALS** — hai thứ này mất là không dựng lại được.

---

## 7. Server LAN — vận hành

Khi máy đã bật nguồn:

```bash
ssh riviu@192.168.110.101
# hoặc qua Tailscale:
ssh riviu@100.74.131.110
```

Stack: `/opt/genposter` (`docker-compose.yml` + `.env` trên server — **không** commit).

```bash
cd /opt/genposter
docker compose ps
docker compose logs -f nocodb
docker compose pull && docker compose up -d   # cập nhật image
```

### Credential cần (xem CREDENTIALS — mục SERVER LAN)

| Loại | Ghi chú |
|---|---|
| SSH `riviu@…` | mật khẩu trong CREDENTIALS |
| Admin NocoDB | thường `riviudalat@riviu.vn` (LAN) |
| Editor / App sync | email + mật khẩu + **`xc-token`** base LAN |
| Postgres | user `genposter` + password trong `.env` server |
| `base_id` | `pcq7mr8crku2d9o` |

### Invite / tạo user đội data

Chi tiết UI + SMTP caveat: [`deploy/README.md`](README.md).

Script đặt mật khẩu sẵn (máy local, trỏ `NC_URL` LAN):

```powershell
$env:NC_URL="http://192.168.110.101:8080"   # hoặc Tailscale URL
$env:GP_ADMIN_PW="..."                      # admin LAN
node deploy/create-team-user.mjs ten@riviu.vn MatKhauMoi123! editor
# Reset acc lỗi: thêm --reset
```

Signup tự do đã khoá (invite-only). **Không** tin link email trỏ `app.nocodb.com` nếu SMTP chưa cấu hình — mở thẳng URL server `/signin/`.

### Backup (trên server — theo README)

- Cron ~`02:00`: `/opt/genposter/backup.sh`
- Dump Postgres: `/opt/backups/daily/`, `/opt/backups/weekly/`
- Mirror ảnh: `/opt/backups/nc_data_mirror/`
- Log: `/var/log/genposter-backup.log`

Khôi phục DB / ảnh: xem mục Backup trong [`deploy/README.md`](README.md).

---

## 8. Tailscale

Thay cho port-forward public: VPN mesh, chỉ máy cùng tài khoản Google trong CREDENTIALS / [`TAILSCALE.md`](TAILSCALE.md) mới vào được.

| Mục | Giá trị |
|---|---|
| Hostname server | `genposter-lan` |
| Tailscale IP | `100.74.131.110` |
| NocoDB | `http://100.74.131.110:8080` |
| SSH | `ssh riviu@100.74.131.110` |

### Cài trên máy mới

1. https://tailscale.com/download
2. Đăng nhập **cùng tài khoản Google** đã dùng cho tailnet (xem CREDENTIALS mục TAILSCALE / TAILSCALE.md — không ghi email đầy đủ ở đây nếu không cần).
3. Bật 2FA cho tài khoản Google đó.
4. Quản lý thiết bị: https://login.tailscale.com/admin/machines

### Lệnh trên server

```bash
sudo tailscale status
sudo tailscale ip -4
sudo tailscale up          # kết nối lại
sudo tailscale down        # ngắt tạm
```

**Lưu ý:** Tailscale online **không đủ** nếu máy vật lý vẫn tắt nguồn.

---

## 9. App — tab Cài đặt

Card **Server dữ liệu (NocoDB)**:

| Ô | Local Docker (hiện tại) | Khi LAN/Tailscale sống lại |
|---|---|---|
| URL chính | `http://localhost:8080` | `http://100.74.131.110:8080` (Tailscale) |
| URL dự phòng (LAN) | có thể để `http://localhost:8080` tạm | `http://192.168.110.101:8080` |
| Base ID | `puzatkuv7t0p8ut` | `pcq7mr8crku2d9o` |
| API token | `xc-token` mục Local Docker | `xc-token` mục LAN |
| Tỉnh | `dalat` | `dalat` |

Nút **Test server** → nếu OK, label hiển thị kênh: **Local Docker** / **LAN** / **Tailscale** (+ ms).

AI API: tuỳ chọn (caption); để trống key = tắt AI. Có thể set qua `.env` Vite (`VITE_AI_*`) — xem root `.env.example` (file đó vẫn ghi default Tailscale/LAN cũ; app code đã ưu tiên Local Docker khi chưa set env).

---

## 10. Quy trình hàng ngày

### Dùng app khi đã có cache

1. `pnpm dev` (hoặc bản build).
2. Tab **Dữ liệu** → Sync nếu cần dữ liệu mới từ NocoDB.
3. Tab **Tạo ảnh** / **Thiết kế** làm việc trên cache offline được.

### Khi Google Sheets đổi nội dung / ảnh

1. Tải xlsx từ Sheets (cách tải: mục 3) → ghi đè `data/database/fnb_dalat.xlsx`; cập nhật `data/photos/...` nếu ảnh đổi.
2. Đảm bảo NocoDB đang chạy (Local Docker hoặc LAN).
3. Import lại (thường wipe + full, hoặc import có `--sheet` / resume state — hiểu trade-off trước khi wipe).
4. `node deploy/verify-import.mjs` — đối chiếu số dòng vs Excel (nhớ set `NC_URL`/`NC_BASE_ID`/`NC_APP_TOKEN`; default script trỏ **LAN**).
5. `node deploy/sync-cache.mjs` **hoặc** Sync trong app.
6. Kiểm tra vài dòng `Da_duyet` + ảnh trên tab Dữ liệu / Tạo ảnh.

### Đội nhập liệu trên NocoDB (khi LAN sống)

Quy trình 1 quán: thêm dòng → điền field → kéo ảnh vào `Anh` → trưởng nhóm đặt `Trang_thai = Da_duyet` → app sync.

---

## 11. Lỗi thường gặp (troubleshooting)

| Triệu chứng | Nguyên nhân thường gặp | Xử lý |
|---|---|---|
| Test server "Không kết nối được" | NocoDB chưa chạy / URL sai | `cd deploy; docker compose --env-file .env ps`; mở thử `http://localhost:8080` bằng browser |
| Sync báo 401 / token invalid | Dán token của **môi trường kia** (Local ≠ LAN) hoặc token trống | Dán lại `xc-token` đúng mục trong CREDENTIALS |
| Test OK nhưng bảng trống / thiếu sheet | Base ID nhầm môi trường | Đổi Base ID theo bảng mục 4 (Local `puzatkuv7t0p8ut`, LAN `pcq7mr8crku2d9o`) |
| `docker compose up` lỗi | Docker Desktop chưa bật, hoặc port 8080 bận | Bật Docker Desktop; `netstat -ano \| findstr :8080` tìm app chiếm port |
| Import dừng giữa chừng | Mạng / NocoDB restart | Chạy lại `import-to-nocodb.mjs` — tự resume qua `import-state.local.json`. Muốn sạch từ đầu: wipe + xoá state |
| Quán có dòng nhưng không ảnh | Folder ảnh không khớp tên | Mục 5 — kéo ảnh vào cột `Anh` trên NocoDB, hoặc đổi tên folder + wipe/import lại |
| Render sai font / thiếu chữ | `data/brand/fonts/` thiếu file | `pnpm fetch:fonts`; xem `data/brand/fonts/README.md` |
| `pnpm dev` lỗi build | Thiếu Rust / WebView2 | Cài theo mục 2 (Yêu cầu) |
| Cache hiện dữ liệu cũ sau khi đổi môi trường | Chưa Sync lại sau khi đổi base/token | Tab Dữ liệu → Sync (cache bị thay toàn bộ theo server đang trỏ) |

---

## 12. Bí mật & bảo mật

- **Không commit:** `deploy/CREDENTIALS.local.md`, `deploy/.env`, `deploy/*.local.*`, root/app `.env` có token.
- Gitignore liên quan: `.env`, `.env.*` (trừ `.env.example`), `deploy/*.local.*`.
- Không paste `xc-token` / mật khẩu admin / Postgres vào chat công khai, issue, PR, screenshot docs.
- Signup NocoDB: invite-only — giữ nguyên.
- **Không** forward port Postgres `5432` ra ngoài.
- Public `1.52.185.91:8080` kém an toàn hơn Tailscale — chỉ dùng tạm; dài hạn nên tắt port-forward, chỉ Tailscale (+ HTTPS/domain nếu cần).
- VPS cũ ngừng dùng — đừng trỏ app về đó.

Thứ người nhận phải có **bản copy vật lý** (USB / Drive — đều không có trên GitHub):

1. File `CREDENTIALS.local.md` đầy đủ (Local Docker + LAN + Tailscale + ghi chú VPS cũ).
2. **`data/photos/` — 9.6 GB, 7486 file ảnh gốc.** Không có nó thì không import lại được server và không sửa được 25 dòng miss. Quan trọng ngang CREDENTIALS.
3. (Khuyến nghị) `data/cache/dalat/` — 7.4 GB, đỡ phải sync lại từ đầu.
4. `deploy/.env` Local Docker (hoặc biết cách tạo lại `PG_PASSWORD`).
5. Quyền truy cập Google Sheets (biên tập).
6. Tài khoản Google tailnet Tailscale.
7. SSH `riviu` máy LAN (và biết ai giữ quyền vào phòng máy / bật nguồn).
8. (Tuỳ chọn) key SSH VPS cũ nếu còn việc archive — không bắt buộc vận hành hàng ngày.

---

## 13. Checklist bàn giao — ngày 1

### Ai giữ gì (điền tay khi bàn giao — đừng bỏ trống)

| Thứ | Người giữ | Liên hệ |
|---|---|---|
| Google Sheets (quyền edit) | | |
| `CREDENTIALS.local.md` bản gốc | | |
| `data/photos/` bản gốc (9.6 GB) | | |
| Admin NocoDB LAN | | |
| SSH `riviu` + quyền vào phòng máy / bật nguồn | | |
| Tài khoản Google tailnet Tailscale | | |

### Việc ngày 1 — người nhận đánh dấu khi xong:

- [ ] Clone repo, `pnpm install`, chạy được `pnpm dev`
- [ ] Nhận bản copy `deploy/CREDENTIALS.local.md` (không có trên Git)
- [ ] Nhận bản copy `data/photos/` (9.6 GB) — kiểm tra đủ ~7486 file
- [ ] (Khuyến nghị) nhận `data/cache/dalat/` (7.4 GB) để khỏi sync từ đầu
- [ ] Điền xong bảng **Ai giữ gì** ở trên
- [ ] First-run: chọn `rootDir` đúng thư mục clone
- [ ] Font: `pnpm fetch:fonts` hoặc xác nhận `data/brand/fonts/` đủ Tier A
- [ ] Docker Desktop: `docker compose --env-file .env up -d` trong `deploy/` → mở được http://localhost:8080
- [ ] App Cài đặt: URL localhost + base `puzatkuv7t0p8ut` + token Local Docker → **Test server** = Local Docker OK
- [ ] Tab Dữ liệu → Sync (hoặc `sync-cache.mjs`) → thấy cache `dalat`
- [ ] Cài Tailscale, login đúng tài khoản Google (để sẵn khi server LAN bật)
- [ ] Biết SSH LAN / đường dẫn `/opt/genposter` (dùng khi máy công ty bật)
- [ ] Biết ai giữ: mật khẩu Google Sheets, admin NocoDB LAN, SSH `riviu`, quyền vào máy vật lý (power on)
- [ ] Đọc `AGENTS.md` + README/TAILSCALE/PORT-FORWARD trong `deploy/`
- [ ] Biết tự tải Sheets → xlsx (mục 3)
- [ ] Hiểu: hiện làm việc trên Local Docker; LAN offline vì **tắt nguồn**, không chỉ VPN
- [ ] Hiểu: base LAN đang chứa **dữ liệu cũ** — khi bật lại phải wipe + import trước khi trỏ app (mục 5)

---

## 14. Liên hệ / chỗ tìm thêm

| Cần | Xem |
|---|---|
| Trạng thái server / nhật ký thay đổi Agent | [`AGENTS.md`](../AGENTS.md) |
| Invite user, backup, danh sách scripts | [`deploy/README.md`](README.md) |
| Tailscale | [`deploy/TAILSCALE.md`](TAILSCALE.md) |
| Port-forward public | [`deploy/PORT-FORWARD.md`](PORT-FORWARD.md) |
| Mật khẩu / token | `deploy/CREDENTIALS.local.md` (local only) |
| Mapping sheet → field | [`data/mapping.yaml`](../data/mapping.yaml) |
| Defaults URL app | [`apps/desktop/src/lib/settings.ts`](../apps/desktop/src/lib/settings.ts) |

### Scripts `deploy/` hay dùng

| Script | Việc |
|---|---|
| `setup-nocodb.mjs` | Tạo base / bảng / acc / token lần đầu |
| `wipe-table-records.mjs` | Xoá hết record (giữ schema) trước import sạch |
| `import-to-nocodb.mjs` | Đổ xlsx + ảnh → NocoDB |
| `verify-import.mjs` | Đối chiếu số dòng bảng vs Excel sau import — **default trỏ LAN**, nhớ set `NC_URL`/`NC_BASE_ID`/`NC_APP_TOKEN` |
| `sync-cache.mjs` | NocoDB → `data/cache/<tỉnh>/` |
| `check-server.mjs` | Health: signup lock + list bảng bằng app token |
| `create-team-user.mjs` | Tạo user Editor + mật khẩu sẵn |
| `lock-signup.mjs` | Khoá đăng ký tự do |
| `backup.sh` | Chạy trên server `/opt/genposter` |

### Khoảng trống tài liệu (biết trước)

- **Wake-on-LAN / remote power-on** máy server LAN: **chưa** có trong docs — cần người tại chỗ hoặc bổ sung quy trình IT sau.
- Root `.env.example` vẫn ghi default Vite theo Tailscale/LAN cũ; runtime app đã default Local Docker qua `settings.ts` khi không set `VITE_NC_*`.
- Hai `base_id` khác nhau (Local vs LAN) — sync cache từ môi trường A không thay thế dữ liệu môi trường B; khi chuyển môi trường phải đổi token + base + Sync lại.

### Định hướng hạ tầng (khuyến nghị — chưa làm, người tiếp quản cân nhắc)

1. **Giám sát uptime** server chính (UptimeRobot / healthchecks.io ping URL Tailscale, alert Telegram/email) — máy LAN từng tắt nguồn ~3 ngày không ai biết.
2. **Backup offsite cho LAN**: backup hiện nằm trên chính máy đó (`/opt/backups/`) — chết ổ là mất cả data lẫn backup. Đẩy dump hằng đêm lên Drive/rclone.
3. **Cân nhắc VPS nhỏ** (~150–250k/tháng) thay máy LAN nếu tiếp tục thiếu ổn định: NocoDB + Tailscale-only + backup offsite; team từng vận hành VPS (180.93.114.89) nên quy trình có sẵn.
4. **Tự động hoá Sheets → NocoDB** qua Google Sheets API (service account) — bỏ bước tải xlsx tay, chỗ dễ quên nhất của quy trình hiện tại.
5. **Tắt hẳn public port-forward** `1.52.185.91:8080` khi Tailscale hoạt động ổn định — đã khuyến nghị trong PORT-FORWARD.md, chưa có deadline.

---

*Cập nhật file này mỗi khi đổi URL chính, base_id, hoặc trạng thái bật/tắt server — và ghi dòng tương ứng vào bảng Nhật ký trong `AGENTS.md`.*
