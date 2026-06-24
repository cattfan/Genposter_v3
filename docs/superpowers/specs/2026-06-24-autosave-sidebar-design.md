# Auto-save + sidebar style nhanh & màu brand

- Ngày: 2026-06-24
- Trạng thái: Đã chốt, triển khai
- Liên quan: `DesignWorkspace`, `Toolbar`, `LeftPanel`, `useEditor`

## 1. Mục tiêu

1. **Auto-save:** Mọi thay đổi scene lưu disk ngay (không nút “Lưu mẫu”, không debounce 2s).
2. **Toolbar:** Hiển thị trạng thái `Đang lưu…` / `Đã lưu` / `Lỗi lưu`.
3. **Sidebar P1:** Style chữ nhanh (tab Thêm) + block màu Riviu (tab Nền).

## 2. Quyết định

| Chủ đề | Lựa chọn |
|--------|----------|
| Trigger lưu | Ngay sau thao tác hoàn tất (Fabric `object:*`, `updateActive`, nền…) |
| Không lưu khi | `restoring` (load/undo/redo), chỉ đổi zoom |
| Tên mẫu | Lưu khi blur ô tên |
| UI | Thay nút cam bằng indicator; bỏ toast “Đã lưu” |
| Kiến trúc | `useEditor({ onSceneChange })` → `DesignWorkspace.autoSave()` |
| Sidebar | 3 preset text + swatch màu brand |

## 3. Auto-save

### 3.1 Luồng

```
Canvas change → notifySceneChange() → DesignWorkspace.autoSave()
  → commitCurrent() → saveTemplateSet() → status UI
```

Hàng đợi: nếu đang `saving`, đánh dấu pending và lưu lại một lần sau khi xong.

### 3.2 Toolbar

- `saving` → `saveStatus: 'idle' | 'saving' | 'saved' | 'error'`
- Lỗi: click indicator → retry save

## 4. Sidebar

### 4.1 Tab Thêm — Style nhanh

| Preset | Mô tả |
|--------|--------|
| Caption | 28px, xám, Be Vietnam Pro |
| Giá | 56px bold, cam Riviu |
| Nhãn | 32px extra bold, trắng (user đổi nền/shape sau) |

API: `ed.addTextPreset(props)`.

### 4.2 Tab Nền — Màu Riviu

Swatch 1-click áp `setBackgroundColor` — 5 màu từ palette brand.

## 5. Ngoài phạm vi

Logo asset, tìm lớp, debounce 2s, giữ nút Lưu thủ công.

## 6. Kiểm thử

- [ ] Sửa text → “Đang lưu…” → “Đã lưu”; reload mẫu giữ thay đổi
- [ ] Kéo object → lưu khi thả chuột
- [ ] Đổi tên blur → lưu
- [ ] Style nhanh thêm đúng kiểu
- [ ] Swatch Riviu đổi nền trang
