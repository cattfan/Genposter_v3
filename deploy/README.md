# Genposter Data Server

Máy chủ dữ liệu cho đội nhập liệu: NocoDB (giao diện bảng tính) + PostgreSQL,
chạy Docker trên Ubuntu 24.04.

Hai môi trường đang chạy:

| | Server LAN (chính) | VPS (dự phòng) |
|---|---|---|
| Web | **http://192.168.110.101:8080** | http://180.93.114.89:8080 |
| Truy cập | Máy cùng mạng LAN công ty | Từ mọi nơi qua internet |
| SSH | `riviu@192.168.110.101` | `root@180.93.114.89` (chỉ key) |
| Base | "Riviu Đà Lạt" | "Genposter Data" |

Tài khoản + mật khẩu: xem `deploy/CREDENTIALS.local.md` (KHÔNG commit file này).
Lưu ý: server LAN không vào được từ ngoài công ty — muốn truy cập từ xa thì
mở port trên router hoặc dùng VPN (Tailscale).

## Tài khoản & phân quyền

| Tài khoản | Vai trò | Được làm gì |
|---|---|---|
| `riviudalat@riviu.vn` (LAN) / `admin@genposter.vn` (VPS) | Owner / super admin | Mọi thứ: sửa cấu trúc bảng, thêm người, xoá data |
| `data@genposter.vn` | Editor | Thêm/sửa/xoá dòng, upload ảnh. KHÔNG sửa được cấu trúc bảng |
| `app@genposter.vn` | Viewer + API token | Chỉ đọc — token dùng cho app Genposter sync |

Đăng ký tự do đã khoá (invite-only). Thêm nhân viên mới: đăng nhập admin →
Base "Genposter Data" → Members → Invite (role **Editor**), gửi link mời cho họ.

Lịch sử chỉnh sửa: mở record → tab bên phải hiển thị ai sửa ô nào, thêm/xoá
ảnh nào, lúc nào.

## Cấu trúc dữ liệu

Base **Genposter Data** — 10 bảng, y hệt 10 sheet Excel cũ (`Quan_an`, `Cafe`,
`Homestay`, `Check_in`, `Khu_du_lich`, `Dich_vu`, `Choi_đem`, `Hoat_dong`,
`Hinh_nen`, `Luu_y`), giữ nguyên tên cột, thêm 3 cột mới:

- `Anh` — attachment: kéo thả nhiều ảnh thẳng vào ô, thứ tự ảnh = thứ tự dùng
  trong khuôn (`photo:item:0` là ảnh đầu).
- `Trang_thai` — `Nhap` (mặc định khi nhập mới) / `Da_duyet` / `Xoa`.
  App chỉ lấy dòng `Da_duyet`. Muốn xoá thì đổi sang `Xoa` (đừng xoá dòng —
  giữ lịch sử + để app biết mà dọn cache).
- `Tinh` — hiện có `dalat`. Mở tỉnh mới: admin thêm option vào cột này.

Quy trình nhập 1 quán: **+ dòng mới → gõ thông tin → kéo ảnh vào ô Anh →
trưởng nhóm đổi Trang_thai = Da_duyet**.

## Vận hành server

SSH (chỉ đăng nhập bằng key, password đã tắt):

```
ssh -i ~/.ssh/genposter_vps root@180.93.114.89
```

Stack nằm ở `/opt/genposter` (docker-compose.yml + .env):

```
cd /opt/genposter
docker compose ps          # trạng thái
docker compose logs -f nocodb
docker compose pull && docker compose up -d   # cập nhật phiên bản
```

Bảo mật đã bật: ufw (mở 22/80/443/8080), fail2ban, signup khoá.

## Backup

- Cron `02:00` hằng đêm chạy `/opt/genposter/backup.sh`
  (log: `/var/log/genposter-backup.log`):
  - Dump Postgres → `/opt/backups/daily/` (giữ 7 bản) + `/opt/backups/weekly/`
    (giữ 4 bản, tạo Chủ nhật).
  - Mirror ảnh đính kèm → `/opt/backups/nc_data_mirror/` (rsync tăng dần).
- **Nên bật thêm snapshot định kỳ trong panel nhà cung cấp VPS** (lớp thứ 2,
  phòng hỏng cả ổ đĩa).

Khôi phục database:

```
cd /opt/genposter
docker compose exec -T postgres dropdb  -U genposter genposter --if-exists  # cẩn thận!
docker compose exec -T postgres createdb -U genposter genposter
docker compose exec -T postgres pg_restore -U genposter -d genposter \
  < /opt/backups/daily/genposter_YYYY-MM-DD.dump
docker compose restart nocodb
```

Khôi phục ảnh: copy ngược `/opt/backups/nc_data_mirror/` vào volume
`genposter_nc_data` rồi restart.

## API cho app (phase 2)

- Base URL: `http://180.93.114.89:8080`, header `xc-token: <app_api_token>`
  (token trong CREDENTIALS.local.md, quyền chỉ đọc).
- `GET /api/v2/tables/{tableId}/records?where=(Trang_thai,eq,Da_duyet)~and(Tinh,eq,dalat)`
- Sync tăng dần: lọc thêm `(UpdatedAt,gt,<lần sync trước>)`.
- CORS đã mở nên gọi thẳng từ app được.

## Scripts trong thư mục này

| File | Chạy ở đâu | Làm gì |
|---|---|---|
| `docker-compose.yml`, `backup.sh` | VPS `/opt/genposter` | Stack + backup |
| `setup-nocodb.mjs` | máy local | Tạo base/bảng/tài khoản (chạy lại an toàn) |
| `import-to-nocodb.mjs` | máy local | Đổ Excel + ảnh lên server (resumable, `--sheet X --limit N`) |
| `verify-import.mjs` | máy local | Đối chiếu số dòng DB vs Excel + spot-check ảnh |
| `lock-signup.mjs` | máy local | Khoá signup + dọn tài khoản lạ |
| `check-server.mjs`, `check-cors.mjs` | máy local | Health check nhanh |

Cần mật khẩu trong env trước khi chạy script local: đọc
`deploy/CREDENTIALS.local.md` rồi `$env:GP_ADMIN_PW="..."`.
