# Bố trí công cụ Thiết kế (Hybrid D) + mở rộng font

- Ngày: 2026-06-24
- Trạng thái: Đã chốt thiết kế, chờ lên kế hoạch triển khai
- Brainstorm visual: `.superpowers/brainstorm/…/editor-layout-options.html` (phương án A–D)

## 1. Mục tiêu

Cải thiện **bố trí UI tab Thiết kế** (trình sửa đa trang đã có) để thao tác chuẩn hơn — gần Figma/Canva — đồng thời **mở rộng thư viện font** cho poster tiếng Việt, render offline đúng trên canvas và khi xuất ảnh.

**Thành công khi:**

- Canvas poster dọc (1588×2248) có không gian ngang tối đa; công cụ hay dùng gần tay.
- Inspector không chiếm chỗ khi không cần; căn chỉnh/nhân bản/xóa không bắt mở panel.
- Dropdown font có **≥12 family** thực sự load được, hỗ trợ dấu tiếng Việt; preview đúng kiểu chữ trên canvas + thumbnail + Tạo ảnh.

## 2. Quyết định đã chốt (brainstorm)

| Chủ đề | Lựa chọn |
|--------|----------|
| Bố cục tổng | **D — Hybrid** |
| Panel phải (Inspector) | **Overlay** từ cạnh phải, **không co** canvas; đóng bằng `×`, click backdrop, `Esc` |
| Thanh nổi trên canvas | Căn chỉnh + thứ tự lớp + **nhân bản / khóa / xóa** |
| Tab panel trái mặc định | **Nhớ tab cuối (global)** qua `localStorage` |
| Font | **Thêm nhiều font** — bundle offline, ưu tiên tiếng Việt |

## 3. Phạm vi

**Trong phạm vi**

- Refactor layout editor: toolbar, grid, rail phải, `ContextBar`, `InspectorDrawer`.
- Gỡ menu **Thêm** trùng trên toolbar.
- Gỡ section **Sắp xếp** khỏi accordion Inspector (chuyển lên thanh nổi).
- Mở rộng `fonts.ts` + file `.ttf` trong `data/brand/fonts/` + dropdown font có tìm kiếm + preview.
- `localStorage` cho tab trái và trạng thái mở inspector.

**Ngoài phạm vi**

- Kéo resize panel trái/phải.
- Shortcut bàn phím mới (ngoài Esc đóng drawer).
- Import font tùy ý từ máy người dùng.
- Dark mode, icon vector trang trí, bo góc ảnh nâng cao.

## 4. Bố cục chi tiết

### 4.1 Khung tổng

```
┌─────────────────────────────────────────────────────────────┐
│ TOOLBAR (56px) — điều hướng + zoom                         │
├──────────┬──────────────────────────────────────────┬───────┤
│ LEFT     │              STAGE / CANVAS               │ RAIL  │
│ 240px    │         [ContextBar khi có selection]       │ 44px  │
│ luôn mở  │                                           │       │
├──────────┴──────────────────────────────────────────┴───────┤
│ PAGE STRIP — giữ nguyên                                     │
└─────────────────────────────────────────────────────────────┘
```

**CSS grid body:** `240px | 1fr | 44px` (thay `266px | 1fr | 300px` hiện tại).

### 4.2 Toolbar trên

| Vùng | Thành phần |
|------|------------|
| Trái | `← Trang tổng`, `TextInput` tên mẫu, `Lưu mẫu` |
| Phải | `Trang k/n`, undo/redo, zoom − / reset 50% / +, `%` |

**Gỡ:** menu `Thêm` và mọi import `pickImage` chỉ dùng cho menu đó trên toolbar.

### 4.3 Panel trái (240px, luôn mở)

Giữ 5 tab icon: **Thêm · Ảnh · Nền · Dữ liệu · Lớp**. Logic nội dung tab không đổi.

- Key `localStorage`: `genposter.editor.leftTab` — giá trị `"add"|"upload"|"bg"|"data"|"layers"`.
- Lần mở editor sau: khôi phục tab đã lưu; mặc định `"add"` nếu chưa có.

### 4.4 Context bar (thanh nổi)

- Component mới: `ContextBar.tsx`, render trong `.stage` (absolute, top center của vùng canvas).
- Hiện khi `ed.getActive()` khác null; ẩn khi không chọn.
- Nút (ActionIcon.Group + Tooltip):

  **Căn:** trái, giữa ngang, phải, trên, giữa dọc, dưới.

  **Lớp:** lên cùng, lên 1, xuống 1, xuống cùng.

  **Thao tác:** nhân bản, khóa/mở khóa, xóa (đỏ).

- Khi `getActiveMany().length >= 3`: thêm dàn đều ngang/dọc.
- Gọi API `ed` hiện có — không logic Fabric mới.

### 4.5 Rail phải + Inspector overlay

**Rail (44px):** một nút **Inspector** (icon layout). Có thể tự mở drawer lần đầu chọn object trong phiên nếu user chưa từng đóng (tùy chọn implement: mặc định mở khi chọn).

**Drawer overlay:**

- `position: fixed` hoặc absolute trong editor root; `width: 300px`; `right: 44px` (không che rail); `top` dưới toolbar; `bottom` trên page strip.
- Backdrop mờ `rgba(0,0,0,0.15)` chỉ phủ vùng stage (không che left panel, toolbar, page strip).
- Header: loại object + nút đóng.
- Body: nội dung `PropertiesPanel` hiện tại **trừ** accordion **Sắp xếp** (đã chuyển ContextBar).
- Key `localStorage`: `genposter.editor.inspectorOpen` (`"true"|"false"`).

**Đóng:** `×`, click backdrop, `Esc`.

### 4.6 Page strip

Không thay đổi hành vi hay vị trí.

## 5. Mở rộng font chữ

### 5.1 Vấn đề hiện tại

- `availableFamilies()` trả về Arial, Georgia, Roboto… **không được `FontFace` load** → canvas có thể fallback sai khi xuất.
- Chỉ có Montserrat `.ttf` trong repo; Be Vietnam Pro khai báo nhưng file có thể thiếu.
- Dropdown `Select` font không tìm kiếm, không preview kiểu chữ.

### 5.2 Nguyên tắc

1. **Offline-first:** mọi font dùng trên canvas phải có file `.ttf` trong `data/brand/fonts/` và đăng ký qua `ensureFonts()`.
2. **Tiếng Việt:** chỉ đưa vào catalog font có subset Vietnamese đầy đủ (Google Fonts `vietnamese` axis hoặc đã kiểm tra glyph).
3. **Danh sách UI = danh sách đã load:** `availableFamilies()` chỉ trả family đã có trong `AVAILABLE` sau `ensureFonts()`.
4. **Nhóm trực quan** trong dropdown (Mantine `Select` với `group`):

   - **Sans — nội dung:** Be Vietnam Pro, Inter, Noto Sans, Open Sans, Roboto, Source Sans 3
   - **Sans — tiêu đề:** Montserrat, Oswald, Lexend, Nunito, Quicksand
   - **Serif:** Merriweather, Lora, Playfair Display
   - **Trang trí:** Dancing Script, Pacifico *(chỉ dùng ngắn / tiếng Anh số; ghi chú trong UI)*

5. **Trọng số tối thiểu mỗi family:** Regular (400) + Bold (700); thêm Italic nếu có sẵn file.

### 5.3 Catalog cụ thể (ship trong repo)

| Family | File (ví dụ) | Ghi chú |
|--------|----------------|---------|
| Be Vietnam Pro | `BeVietnamPro-{Regular,Medium,SemiBold,Bold,Italic}.ttf` | Mặc định app |
| Inter | `Inter-Regular.ttf`, `Inter-Bold.ttf` | Body hiện đại |
| Noto Sans | `NotoSans-Regular.ttf`, `NotoSans-Bold.ttf` | Unicode/VN tốt |
| Open Sans | `OpenSans-Regular.ttf`, `OpenSans-Bold.ttf` | Đọc dài |
| Roboto | `Roboto-Regular.ttf`, `Roboto-Bold.ttf` | Phổ biến |
| Source Sans 3 | `SourceSans3-Regular.ttf`, `SourceSans3-Bold.ttf` | Báo cáo |
| Montserrat | đã có Bold/ExtraBold | Tiêu đề; hạn chế dấu VN |
| Oswald | `Oswald-Bold.ttf` | Tiêu đề condensed |
| Lexend | `Lexend-Regular.ttf`, `Lexend-Bold.ttf` | Dễ đọc |
| Nunito | `Nunito-Regular.ttf`, `Nunito-Bold.ttf` | Bo tròn |
| Quicksand | `Quicksand-Regular.ttf`, `Quicksand-Bold.ttf` | Thân thiện |
| Merriweather | `Merriweather-Regular.ttf`, `Merriweather-Bold.ttf` | Serif body |
| Lora | `Lora-Regular.ttf`, `Lora-Bold.ttf` | Serif cổ điển |
| Playfair Display | `PlayfairDisplay-Bold.ttf` | Serif display |
| Dancing Script | `DancingScript-Regular.ttf` | Script |
| Pacifico | `Pacifico-Regular.ttf` | Script logo |

Tổng **~16 family**, **~30 file .ttf** (ước lượng). Nguồn: [Google Fonts](https://fonts.google.com) (OFL). Thêm script tải hoặc hướng dẫn trong `data/brand/fonts/README.md`.

### 5.4 Thay đổi code

**`apps/desktop/src/lib/fonts.ts`**

- Tách `FONT_CATALOG: FontDef[]` (family, file, weight, style, group?).
- `ensureFonts()` giữ vòng lặp hiện tại; `AVAILABLE` chỉ add khi load thành công.
- `availableFamilies(): { value, label, group }[]` — sorted theo group rồi tên.
- `getFontPreviewStyle(family)` helper cho dropdown.

**Inspector — accordion Văn bản**

- Đổi `Select` font → `Combobox` hoặc `Select` `searchable` (Mantine v7) với `renderOption` hiển thị tên **bằng chính font đó**.
- Khi đổi font: `updateActive({ fontFamily })` + `requestRenderAll` sau `document.fonts.load`.

**Render pipeline**

- `thumbnail.ts`, `render.ts` đã gọi `ensureFonts()` — không đổi contract; chỉ cần catalog đủ file.

### 5.5 Kích thước & hiệu năng

- Load lazy: `ensureFonts()` chạy một lần khi vào editor (như hiện tại). Chấp nhận ~2–5 MB tổng font cho desktop.
- Nếu file thiếu: bỏ qua im lặng (giữ hành vi hiện tại), family không xuất hiện trong dropdown.

## 6. Kiến trúc component (sau refactor)

| File | Trách nhiệm |
|------|-------------|
| `EditorTab.tsx` | Grid layout; ghép LeftPanel, Stage, RightRail, PageStrip |
| `Toolbar.tsx` | Chỉ điều hướng + zoom (đã thu gọn) |
| `LeftPanel.tsx` | Tab trái + persist tab |
| `ContextBar.tsx` | Thanh nổi selection |
| `RightRail.tsx` | Icon rail 44px |
| `InspectorDrawer.tsx` | Overlay + PropertiesPanel body |
| `PropertiesPanel.tsx` | Accordion thuộc tính (bỏ Sắp xếp); font Combobox |
| `editor.css` | Grid 240/1fr/44, drawer, backdrop, context bar |

`DesignWorkspace` / `useEditor` **không đổi** public API.

## 7. Kiểm thử

**Layout**

- [ ] Toolbar không còn menu Thêm; thêm text vẫn qua panel trái.
- [ ] Chọn object → ContextBar hiện; căn/xóa/nhân bản hoạt động.
- [ ] Inspector overlay không đổi kích thước canvas; Esc/backdrop đóng.
- [ ] Đổi tab trái → reload app → tab giữ nguyên.
- [ ] Đổi trang / Lưu / về Trang tổng không regression.

**Font**

- [ ] Dropdown liệt kê ≥12 family sau khi file ship đủ.
- [ ] Gõ tiếng Việt có dấu trên canvas với Be Vietnam Pro, Noto Sans, Inter.
- [ ] Thumbnail trang và Tạo ảnh render đúng font đã chọn.
- [ ] Family thiếu file không xuất hiện trong list.

## 8. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|--------|-------------|
| Repo phình vì .ttf | Chỉ Regular+Bold; script tải tùy chọn; git LFS nếu cần |
| Montserrat / script thiếu dấu VN | Nhóm riêng + tooltip trong dropdown |
| Drawer che canvas | Overlay + đóng nhanh; không bắt buộc mở liên tục |

## 9. Thứ tự triển khai gợi ý (cho writing-plans)

1. Layout shell: grid + toolbar thu gọn + RightRail stub.
2. ContextBar + gỡ Sắp xếp khỏi PropertiesPanel.
3. InspectorDrawer overlay + persist + Esc.
4. Font catalog + tải file + `availableFamilies` + Combobox preview.
5. Kiểm thử thủ công end-to-end.
