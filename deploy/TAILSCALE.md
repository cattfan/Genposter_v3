# Truy cập server LAN từ xa qua Tailscale

Thay vì port-forward router (public thẳng port 8080 ra internet — xem
`deploy/PORT-FORWARD.md`), server LAN đã cài **Tailscale**: mạng riêng ảo
(VPN mesh, miễn phí) — chỉ máy nào đăng nhập cùng tài khoản mới vào được,
không cần mở port trên router, không lộ NocoDB ra internet công khai.

## Trạng thái hiện tại

| Máy | Tailscale IP | Ghi chú |
|---|---|---|
| Server LAN (`192.168.110.101`) | **`100.74.131.110`** | hostname `genposter-lan`, service `tailscaled` tự chạy khi server boot |

Tài khoản tailnet: **`cattfan239@…`** (đăng nhập Google) — cùng tài khoản
từng dùng cho 2 máy khác (`v56uip`, `vps-cm7v2u`), hiện đang offline.
Mật khẩu/token khác xem `deploy/CREDENTIALS.local.md`.

## Cài Tailscale trên máy mới để truy cập server

1. Tải & cài: https://tailscale.com/download (Windows/macOS/Linux/iOS/Android).
2. Mở app, đăng nhập **cùng tài khoản Google** (`cattfan239@…`) đã dùng ở trên.
3. Xong — máy sẽ tự có IP dạng `100.x.y.z` và vào thẳng được server:
   - NocoDB: `http://100.74.131.110:8080`
   - SSH: `ssh riviu@100.74.131.110` (mật khẩu như SSH LAN thường)

Không cần VPN công ty, không cần cùng WiFi/mạng — Tailscale tự tìm đường kết
nối (trực tiếp hoặc qua relay của họ) miễn 2 máy cùng đăng nhập chung
tài khoản/tailnet.

## Lệnh hữu ích trên server

```bash
ssh riviu@192.168.110.101   # hoặc ssh riviu@100.74.131.110 nếu máy đã join tailnet
sudo tailscale status       # danh sách máy trong tailnet + trạng thái online/offline
sudo tailscale ip -4        # xem IP tailscale hiện tại của server
```

## Gỡ / đăng xuất (nếu cần)

```bash
sudo tailscale down    # ngắt kết nối tạm, giữ nguyên cấu hình
sudo tailscale up      # kết nối lại (không cần đăng nhập lại nếu chưa logout)
sudo tailscale logout  # đăng xuất khỏi tailnet hẳn (cần đăng nhập lại từ đầu)
sudo apt remove --purge tailscale tailscale-archive-keyring   # gỡ hoàn toàn
```

## Bảo mật

- Thiết bị vào được tailnet do **tài khoản Google `cattfan239@…`** kiểm soát —
  ai đăng nhập được tài khoản đó mới thêm được máy mới vào mạng. Nên bật
  2FA cho tài khoản Google này.
- ufw trên server đã mở sẵn `22/tcp` + `8080/tcp` cho "Anywhere" (xem
  `deploy/PORT-FORWARD.md`) nên traffic tới qua interface `tailscale0`
  không bị chặn thêm — không cần chỉnh ufw để dùng Tailscale.
- Có thể xem/thu hồi từng thiết bị tại
  https://login.tailscale.com/admin/machines.
- Về lâu dài có thể tắt hẳn port-forward router + rule ufw `8080` cho
  "Anywhere", chỉ giữ Tailscale — an toàn hơn vì NocoDB không còn lộ ra
  internet công khai nữa, chỉ máy trong tailnet mới vào được.
