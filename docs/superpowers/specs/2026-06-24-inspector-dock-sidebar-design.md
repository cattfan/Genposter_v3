# Inspector dock + sidebar Thêm gọn + marquee stage

- Ngày: 2026-06-24
- Trạng thái: Đã chốt, triển khai

## 1. Mục tiêu

1. Tab **Thêm**: bỏ Style nhanh; 6 nút thành **cột dọc gọn** (icon không chạm viền).
2. **Inspector** mở **cạnh canvas** (cột grid), không overlay/backdrop.
3. **Marquee chọn** bắt đầu được từ vùng xám ngoài trang trắng; inspector vẫn tương tác bình thường.

## 2. Layout

```
Đóng:  240px | stage 1fr | 44px rail
Mở:    240px | stage 1fr | 300px inspector | 44px rail
```

- Bỏ `.inspector-backdrop`, bỏ `position: absolute` drawer.
- Toggle rail / Esc / × — không đóng khi click stage.

## 3. Tab Thêm

- Xóa section Style nhanh.
- 6 nút: `Stack` 1 cột, ~44px cao, icon trái 20px + label phải, padding 8px.

## 4. Marquee stage

- `pointerdown` trên `.stage` (target === stage) → forward sang canvas upper layer với cùng client coords.
- Click xám không kéo → Fabric bỏ chọn như bình thường.

## 5. Kiểm thử

- [ ] Tab Thêm: 6 nút cột dọc, không Style nhanh
- [ ] Inspector mở: cột phải, canvas co, không mờ
- [ ] Slider/input inspector hoạt động; không đóng khi click stage
- [ ] Quét chọn từ vùng xám qua trang trắng
- [ ] fitTo ổn khi mở/đóng inspector
