# Canva-like text context bar (mở rộng)

- Ngày: 2026-06-24
- Trạng thái: Đã triển khai
- Liên quan: `2026-06-24-context-bar-text-fix-design.md`, `2026-06-24-copy-paste-data-groups-design.md`

## 1. Mục tiêu

Mở rộng thanh context khi chọn văn bản lên mức **Canva C-level**: typography đầy đủ trên strip, popover cho spacing/opacity/effects/position, format painter — Inspector giữ accordion nâng cao.

**Thành công khi:**

- Chọn text → strip 56px hiện đủ cụm controls; scroll ngang khi hẹp.
- Popover không bị clip (portal).
- Ctrl+B/I/U, Ctrl+Shift+S/K, Ctrl+Alt+C hoạt động; Escape hủy format painter.
- Copy/paste style (Ctrl+C/V) bao gồm stroke, shadow, opacity, originY.

**Ngoài phạm vi:** bullet list, animation (“Chuyển động”).

## 2. Thành phần UI

| Cụm | Nội dung |
|-----|----------|
| Font | `FontFamilyCombobox` compact |
| Cỡ chữ | ± stepper + `NumberInput` |
| Màu | `TextColorSwatch` — chữ A + palette |
| Kiểu | B / I / U / gạch ngang / aA (case) |
| Căn | Segmented L / C / R |
| Khoảng cách | `TextSpacingPopover` — charSpacing, lineHeight, originY |
| Opacity | `TextOpacityPopover` — slider 0–100% |
| Hiệu ứng | `TextEffectsPopover` — preset viền/bóng + độ dày viền |
| Vị trí | `TextPositionPopover` — căn trang + thứ tự lớp (`ed.align`, `ed.order`) |
| Format painter | `FormatPainterButton` — Ctrl+Alt+C, click object khác để dán |

## 3. Kiến trúc

- `TextContextBar.tsx` — orchestrator.
- `textEffectPresets.ts` — preset + `applyTextEffectPreset()` (Fabric `Shadow`).
- `styleClipboard.ts` — mở rộng `TEXT_KEYS` (linethrough, stroke*, shadow, opacity, originY, …).
- `useEditor.ts` — `armFormatPainter` / `disarmFormatPainter` / `isFormatPainterArmed`; paste style khi `selection:created|updated` nếu armed; phím tắt typography.
- `ContextBar.tsx` — bỏ `Paper` bọc; controls nằm trực tiếp trong strip.
- `editor.css` — `.ctx-bar-*`, strip `min-height: 56px`, `overflow-x: auto`.

## 4. Phím tắt

| Phím | Hành động |
|------|-----------|
| Ctrl+C / Ctrl+V | Sao chép / dán style (Design) |
| Ctrl+B / I / U | Đậm / nghiêng / gạch chân |
| Ctrl+Shift+S | Gạch ngang |
| Ctrl+Shift+K | Chữ hoa ↔ thường |
| Ctrl+Alt+C | Bật format painter |
| Escape | Tắt format painter |

## 5. Preset hiệu ứng

- Không — xóa viền + bóng
- Viền mảnh / Phương Tây / Viền đậm — `strokeWidth` + `stroke`
- Bóng nhẹ — `shadow` Fabric, không viền

Slider độ dày viền chỉ áp khi preset có stroke.
