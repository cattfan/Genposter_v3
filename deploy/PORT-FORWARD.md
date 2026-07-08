# Public server LAN qua Port Forward

Server NocoDB đang chạy **private** tại `192.168.110.101:8080`.  
Muốn truy cập từ internet cần **router chuyển port** ra máy này.

## Thông số hiện tại

| Mục | Giá trị |
|---|---|
| IP nội bộ server | `192.168.110.101` |
| Port NocoDB | `8080` |
| Public IP (WAN) | `1.52.185.91` *(có thể đổi nếu ISP cấp IP động)* |
| URL sau khi public | **http://1.52.185.91:8080** |

## Bước 1 — Cấu hình router (bạn làm trên web admin router)

1. Máy cùng LAN, mở trình duyệt → vào gateway (thường là một trong các địa chỉ):
   - `http://192.168.110.1`
   - `http://192.168.1.1`
2. Đăng nhập admin router (hỏi IT / xem nhãn dán modem).
3. Tìm mục **Port Forwarding** / **NAT** / **Virtual Server** / **Chuyển tiếp cổng**.
4. Thêm rule:

   | Tên | Giao thức | Port ngoài (WAN) | IP trong (LAN) | Port trong |
   |---|---|---|---|---|
   | NocoDB | TCP | `8080` | `192.168.110.101` | `8080` |

5. Lưu và **reboot router** nếu được yêu cầu.

**Lưu ý:** Một số ISP chặn port 8080. Nếu không vào được, thử map `8888` (WAN) → `8080` (LAN) rồi dùng `http://1.52.185.91:8888`.

## Bước 2 — Cập nhật server (đã có script)

Trên server LAN:

```bash
scp deploy/port-forward-lan.sh riviu@192.168.110.101:/tmp/
ssh riviu@192.168.110.101
sudo bash /tmp/port-forward-lan.sh 1.52.185.91
```

Script sẽ:
- Đặt `NC_PUBLIC_URL=http://1.52.185.91:8080`
- Bật ufw, mở port 22 + 8080
- Restart stack Docker

## Bước 3 — Kiểm tra

Từ **điện thoại tắt WiFi (4G)** hoặc máy ngoài công ty:

```
http://1.52.185.91:8080
```

Health check:

```bash
curl http://1.52.185.91:8080/api/v1/health
# Kỳ vọng: {"status":"ok"} hoặc tương đương
```

Đăng nhập admin: `riviudalat@riviu.vn` / mật khẩu trong `CREDENTIALS.local.md`.

## Bước 4 — Cập nhật app Genposter

Tab **Cài đặt → Server Data**:
- URL: `http://1.52.185.91:8080`
- Token + base_id giữ nguyên (trong CREDENTIALS.local.md)

## Bảo mật

- Signup đã khoá (invite-only) — giữ nguyên.
- **Không** forward port Postgres `5432`.
- IP public có thể đổi (dynamic IP) → khi mất truy cập, kiểm tra IP mới bằng `curl ifconfig.me` trên server.
- Về sau nên gắn **domain + HTTPS** (Caddy) thay vì mở `:8080` trần lâu dài.

## IP động — DDNS (tuỳ chọn)

Nếu IP hay đổi, đăng ký miễn phí No-IP / DuckDNS, trỏ hostname về IP WAN, rồi cập nhật `NC_PUBLIC_URL` tương ứng.
