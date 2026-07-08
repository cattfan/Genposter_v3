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
Lưu ý: server LAN mặc định chỉ vào được trong công ty. Muốn truy cập từ xa,
cách khuyên dùng là **Tailscale** (VPN riêng, không cần mở port router, không
lộ NocoDB ra internet công khai) — server đã join tailnet `genposter-lan` →
`100.74.131.110`, xem **`deploy/TAILSCALE.md`**. Cách cũ — port-forward router,
public thẳng ra internet — vẫn còn nhưng kém an toàn hơn: xem
**`deploy/PORT-FORWARD.md`** (public IP hiện tại: `1.52.185.91:8080` sau khi
cấu hình router).

## Tài khoản & phân quyền

| Tài khoản | Vai trò | Được làm gì |
|---|---|---|
| `riviudalat@riviu.vn` (LAN) / `admin@genposter.vn` (VPS) | Owner / super admin | Mọi thứ: sửa cấu trúc bảng, thêm người, xoá data |
| `data@genposter.vn` | Editor | Thêm/sửa/xoá dòng, upload ảnh. KHÔNG sửa được cấu trúc bảng |
| `app@genposter.vn` | Viewer + API token | Chỉ đọc — token dùng cho app Genposter sync |

Đăng ký tự do đã khoá (invite-only).

### Cách 1 — UI NocoDB (không cần gửi email)

**Quan trọng:** tab **Riviu → Members** chỉ có **Remove member** / **Copy User ID** — **KHÔNG có Copy Invite URL**.
Toast *Invitation sent successfully* **không có nghĩa** email đã gửi (server chưa cấu h SMTP).

#### A — Nhân viên **chưa có** tài khoản (email mới)

1. Avatar góc **dưới trái** → **Admin Panel** → **Users**
2. **+ Invite User** → nhập email + role
3. **⋮** bên cạnh user → **Copy Invite URL** → gửi Zalo
4. Nhân viên mở link → **tự đặt mật khẩu** → đăng nhập

#### B — Nhân viên **đã có** tài khoản (vd. `cattfan239@gmail.com`)

Workspace **Members → Invite** chỉ thêm vào workspace — **không tạo pass**, **không có link mời**.

1. **Admin Panel → Users** → **⋮** → **Copy password reset URL** → gửi Zalo
2. Nhân viên mở link → đặt mật khẩu mới → **Sign In**

#### C — Gán quyền base (bắt buộc, nếu không sẽ thấy workspace trống)

Sau A hoặc B, vào base **Riviu Đà Lạt** → **Share / Members** → thêm user → role **Editor**.

**Lưu ý UI:** NocoDB **không có ô admin gõ mật khẩu hộ** — nhân viên tự tạo pass qua invite link hoặc reset link.
Muốn admin đặt pass sẵn → dùng script bên dưới.

### Cách 2 — Script (admin đặt mật khẩu sẵn)

```powershell
$env:GP_ADMIN_PW="<mật khẩu admin, xem CREDENTIALS.local.md>"
node deploy/create-team-user.mjs ten@riviu.vn MatKhau2026! editor
```

Script tạo acc + **đặt mật khẩu** + gán Editor + accept invite. In ra URL/email/password
— admin gửi cho nhân viên qua Zalo/Telegram. **Không dùng email mời NocoDB.**

Reset acc lỗi: thêm `--reset` ở cuối.

### Email mời → link sai (app.nocodb.com)

Server **self-hosted** chưa cấu hình SMTP (`NC_SMTP_*`). Email mời/verify do NocoDB gửi
có thể trỏ sang **[app.nocodb.com](https://app.nocodb.com/signin)** — đó là **cloud**,
**không phải** server Riviu (`192.168.110.101`).

**Đừng bấm link email.** Cách đúng:

1. Mở trực tiếp: **http://192.168.110.101:8080/signin/**
2. Dùng `deploy/create-team-user.mjs` (tạo acc + mật khẩu một lần)
3. Sau này muốn email đúng link → cấu hình SMTP + `NC_PUBLIC_URL=http://192.168.110.101:8080`
   (theo [NocoDB env docs](https://nocodb.com/docs/self-hosting/environment-variables))

Trang **SIGN IN** (email + password) là bình thường — không phải thiếu mật khẩu hệ thống.

### Gói trả phí (Scale / Upgrade) — có unlock được không?

Server đang chạy **Community Edition (CE)** — log: `No license key found — running in CE mode`.
Nút **Scale / Upgrade / FREE PLAN** trên UI là upsell của NocoDB Cloud — **không liên quan**
tới server self-hosted của mình.

| Cần cho đội data Riviu | CE (miễn phí, đang dùng) |
|---|---|
| Nhập/sửa data, upload ảnh | ✅ |
| 10 bảng, unlimited rows | ✅ |
| Grid / Form / Gallery / Kanban… | ✅ |
| Phân quyền Editor/Viewer | ✅ |
| API sync cho app Genposter | ✅ |

| Tính năng Enterprise (trả phí) | CE |
|---|---|
| SSO / SCIM | ❌ cần license |
| Audit log workspace | ❌ |
| Gantt / Timeline view | ❌ |
| Workflows tự động | ❌ |
| White-label | ❌ |

**Không thể “unlock crack”** — cần mua license tại
[nocodb.com/docs/self-hosting/purchase-license](https://nocodb.com/docs/self-hosting/purchase-license)
(~$19/editor/tháng Business) rồi nhập key vào Admin Panel hoặc `NC_LICENSE_KEY`.
Với nhu cầu nhập liệu + ảnh Đà Lạt, **CE đã đủ**, không cần trả phí.

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
| `create-team-user.mjs` | máy local | **Tạo acc + mật khẩu + Editor** (khuyên dùng) |
| `fix-invite.mjs` | máy local | Sửa acc bị mời lỗi |
| `set-user-password.mjs` | máy local | Đổi mật khẩu acc đã có |
| `add-base-member.mjs` | máy local | Chỉ thêm quyền base |
| `fix-site-url.sh` | server | Sửa NC_PUBLIC_URL |
| `check-server.mjs`, `check-cors.mjs` | máy local | Health check nhanh |

Cần mật khẩu trong env trước khi chạy script local: đọc
`deploy/CREDENTIALS.local.md` rồi `$env:GP_ADMIN_PW="..."`.
