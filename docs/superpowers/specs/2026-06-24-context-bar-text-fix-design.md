# Context bar typography + sửa canvas thu hẹp

- Ngày: 2026-06-24
- Trạng thái: Đã chốt thiết kế, chờ review spec → lên kế hoạch triển khai
- Liên quan: `2026-06-24-editor-layout-fonts-design.md` (layout Hybrid D, ContextBar, Inspector overlay)

## 1. Mục tiêu

1. **Context bar** hiển thị controls typography gọn (kiểu Canva) khi chọn văn bản — font, cỡ chữ, B/I/U, màu, căn chữ.
2. **Sửa lỗi canvas thu hẹp** khi chọn/bỏ chọn object do thanh xuất hiện làm `.stage` đổi chiều cao và `fitTo()` chạy lại.

**Thành công khi:**

- Chọn text → thanh typography hiện trên vùng xám (không đè trang); đổi font/size/màu áp ngay canvas.
- Căn trang / thứ tự lớp / nhân bản / khóa / xóa chỉ ở **menu chuột phải** (giữ `CanvasContextMenu`).
- Chọn shape hoặc bỏ chọn → zoom canvas **không nhảy** so với lúc đang xem trang.
- Inspector overlay vẫn có accordion “Văn bản” đầy đủ cho thuộc tính nâng cao.

## 2. Quyết định đã chốt (brainstorm)

| Chủ đề | Lựa chọn |
|--------|----------|
| Nội dung thanh (text) | **C** — Canva gọn + Inspector cho nâng cao |
| Controls trên thanh | Font, cỡ chữ, B/I/U, màu chữ, căn chữ (trái/giữa/phải) |
| Controls **không** trên thanh | Căn trang, lớp, nhân bản, khóa, xóa, dàn đều → chuột phải |
| Khi chọn shape/ảnh | Strip giữ chỗ, **không** hiện controls typography |
| Sửa canvas thu hẹp | Strip **cố định** `min-height: 52px` luôn chiếm chỗ |
| Kiến trúc | Tách `FontFamilyCombobox` dùng chung; `TextContextBar` mới |

## 3. Phạm vi

**Trong phạm vi**

- Refactor `ContextBar.tsx`: bỏ align/layer/duplicate/lock/delete (đã có trong `CanvasContextMenu`).
- Thêm `TextContextBar.tsx` với controls typography compact.
- Tách `FontFamilyCombobox.tsx` từ `PropertiesPanel.tsx`.
- CSS: `min-height` cố định cho `.context-bar-strip`, scroll ngang khi hẹp.
- Không đổi `useEditor` API (dùng `updateActive` hiện có).

**Ngoài phạm vi**

- Quick props cho shape (màu fill trên thanh).
- Typography trên thanh khi multi-select hỗn hợp (chỉ xử lý khi active là text).
- Ghi nhớ zoom tay / không refit khi user zoom (follow-up).
- Thay đổi nội dung Inspector accordion.

## 4. Thiết kế UI

### 4.1 Vị trí

```
┌─────────────────────────────────────────────┐
│ TOOLBAR                                     │
├──────────┬──────────────────────────────────┤
│ LEFT     │ CONTEXT STRIP (52px, luôn có)    │
│ 240px    │  [font][size][B I U][color][≡]   │  ← chỉ khi chọn text
│          ├──────────────────────────────────┤
│          │ STAGE / CANVAS (flex 1)          │
│          │                                  │
├──────────┴──────────────────────────────────┤
│ PAGE STRIP                                  │
└─────────────────────────────────────────────┘
```

Strip nằm **trong** `.stage-column`, **trên** `.stage`, không `position: absolute` trên trang.

### 4.2 Controls typography (text được chọn)

| Control | Component Mantine | Ghi chú |
|---------|-------------------|---------|
| Font | `FontFamilyCombobox` | ~160px, searchable, tier badge, preview |
| Cỡ chữ | `NumberInput` | min 1, ~72px |
| B / I / U | `ActionIcon.Group` | toggle `fontWeight`/`fontStyle`/`underline` |
| Màu chữ | `ColorInput` | compact, `PALETTE` swatches |
| Căn chữ | `SegmentedControl` | left / center / right |

Hàng một; `ScrollArea` ngang nếu viewport hẹp.

### 4.3 Khi không phải text

- `.context-bar-strip` vẫn render (chiều cao 52px).
- Nội dung bên trong rỗng (hoặc spacer invisible).
- User dùng chuột phải + Inspector.

### 4.4 Menu chuột phải

Giữ nguyên `CanvasContextMenu.tsx`: căn chỉnh trang, thứ tự lớp, nhân bản, khóa, xóa, dàn đều (≥3 object).

## 5. Sửa canvas thu hẹp

### 5.1 Nguyên nhân

1. `ContextBar` mount/unmount thay đổi chiều cao `.stage`.
2. `ResizeObserver` trên `.stage` gọi `ed.fitTo(cw, ch)`.
3. `ch` giảm → zoom giảm → trang trông “thu hẹp”; bỏ chọn → zoom tăng lại.

### 5.2 Fix

```css
.context-bar-strip {
  flex-shrink: 0;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid var(--mantine-color-gray-3);
  overflow-x: auto;
}
```

- Strip **luôn** chiếm 52px — kích thước `.stage` ổn định khi chọn/bỏ chọn.
- `ContextBar` luôn render wrapper strip; `TextContextBar` conditional bên trong.
- Không cần đổi logic `fitTo` trong lần này (ResizeObserver giữ nguyên).

## 6. Kiến trúc component

```
FontFamilyCombobox.tsx     ← tách từ PropertiesPanel
TextContextBar.tsx         ← typography compact (mới)
ContextBar.tsx             ← shell: strip + điều kiện text
CanvasContextMenu.tsx      ← không đổi
PropertiesPanel.tsx        ← import FontFamilyCombobox, giữ accordion đầy đủ
EditorTab.tsx              ← ContextBar vẫn trên stage-column
editor.css                 ← min-height strip
```

**Luồng dữ liệu:** `ed.tick` → `ed.getActive()` → `isTextType(obj)` → render `TextContextBar` → `ed.updateActive(props)`.

## 7. Inspector vs thanh

| Thuộc tính | Thanh | Inspector |
|------------|-------|-----------|
| Font family | ✓ | ✓ (trùng OK) |
| Cỡ chữ | ✓ | ✓ |
| B / I / U | ✓ | ✓ |
| Màu chữ | ✓ | ✓ |
| Căn chữ | ✓ | ✓ |
| Nội dung text | — | ✓ |
| Weight dropdown | — | ✓ |
| Giãn dòng / giãn chữ | — | ✓ |
| X, Y, Rộng, Cao, Góc, Opacity | — | ✓ |

## 8. Kiểm thử

- [ ] Chọn text → thanh hiện đủ controls; sửa font/size/màu/căn → canvas cập nhật.
- [ ] Chuột phải → menu căn/lớp/xóa vẫn hoạt động.
- [ ] Chọn shape → strip trống, zoom **không đổi** so với trước khi chọn.
- [ ] Bỏ chọn → zoom **không đổi**.
- [ ] Resize cửa sổ → canvas vẫn fit hợp lý (~40–50% với 1588×2248).
- [ ] Inspector mở → accordion Văn bản đầy đủ, không regression.
- [ ] `pnpm --filter @genposter/desktop typecheck` + `test` pass.

## 9. Thứ tự triển khai (gợi ý cho plan)

1. CSS strip cố định + `ContextBar` luôn render shell (fix zoom trước).
2. Tách `FontFamilyCombobox.tsx`.
3. `TextContextBar.tsx` + wire vào `ContextBar`.
4. Gỡ align/layer/actions khỏi `ContextBar` (nếu còn sót).
5. QA thủ công checklist §8.
