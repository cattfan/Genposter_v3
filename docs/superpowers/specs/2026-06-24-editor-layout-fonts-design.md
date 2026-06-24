# Bố trí công cụ Thiết kế (Hybrid D) + mở rộng font

- Ngày: 2026-06-24
- Trạng thái: Đã chốt thiết kế, chờ lên kế hoạch triển khai
- Brainstorm visual: `.superpowers/brainstorm/…/editor-layout-options.html` (phương án A–D)

## 1. Mục tiêu

Cải thiện **bố trí UI tab Thiết kế** (trình sửa đa trang đã có) để thao tác chuẩn hơn — gần Figma/Canva — đồng thời **mở rộng thư viện font** cho poster tiếng Việt, render offline đúng trên canvas và khi xuất ảnh.

**Thành công khi:**

- Canvas poster dọc (1588×2248) có không gian ngang tối đa; công cụ hay dùng gần tay.
- Inspector không chiếm chỗ khi không cần; căn chỉnh/nhân bản/xóa không bắt mở panel.
- Dropdown font có **≥30 family Việt hoá** thực sự load được (tier A+B), hỗ trợ dấu tiếng Việt; preview đúng kiểu chữ trên canvas + thumbnail + Tạo ảnh.

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
2. **Việt hoá là tiêu chí số 1:** chỉ đưa vào catalog font có **subset `vietnamese`** trên Google Fonts (hoặc đã test chuỗi mẫu `ÁàẢãẠăẰằẢẵẠâẦầẨẫẬđÊềỂễỆôỐốỔỗỘơỜờỞỡỢưỪừỬữỰ`).
3. **Phân tier** — hiển thị badge trong dropdown:
   - **Tier A — VN đầy đủ:** dùng thoải mái cho nội dung tiếng Việt dài.
   - **Tier B — Tiêu đề VN:** sans condensed / display; vẫn có glyph VN nhưng nên dùng cho headline ngắn.
   - **Tier C — Trang trí:** script/handwriting; tooltip *“Nên dùng cho tên thương hiệu / cụm ngắn”*.
4. **Danh sách UI = danh sách đã load:** `availableFamilies()` chỉ trả family có ≥1 file load thành công.
5. **Nhóm dropdown** (Mantine `Select` / `Combobox` với `group`):
   - **Sans — nội dung (VN)**
   - **Sans — tiêu đề & display (VN)**
   - **Serif (VN)**
   - **Bo tròn / thân thiện (VN)**
   - **Trang trí & chữ tay (VN)**
6. **Trọng số tối thiểu:** Regular (400) + Bold (700) mỗi family; Be Vietnam Pro thêm Medium/SemiBold/Italic như hiện tại.
7. **Không liệt kê font ảo** (Arial, Georgia…) nếu chưa bundle file.

### 5.3 Catalog Việt hoá (ship trong repo)

Nguồn: [Google Fonts](https://fonts.google.com) — lọc **Languages → Vietnamese**, license OFL.  
Script tải hàng loạt: `scripts/fetch-brand-fonts.mjs` (implement trong đợt code).

#### Tier A — Sans nội dung (18 family)

| Family | Weights ship | Vai trò poster |
|--------|--------------|----------------|
| **Be Vietnam Pro** | 400, 500, 600, 700, italic 400 | Mặc định; font “nhà” |
| Inter | 400, 700 | Body hiện đại, sạch |
| Noto Sans | 400, 700 | Unicode/VN chuẩn nhất |
| Open Sans | 400, 700 | Đoạn văn dài |
| Roboto | 400, 700 | Quen thuộc, menu/giá |
| Source Sans 3 | 400, 700 | Báo cáo, danh sách |
| IBM Plex Sans | 400, 700 | Doanh nghiệp |
| Fira Sans | 400, 700 | Humanist, dễ đọc |
| Barlow | 400, 700 | Gọn, poster sáng |
| Manrope | 400, 700 | Geometric hiện đại |
| DM Sans | 400, 700 | UI / nhãn |
| Work Sans | 400, 700 | Tương phản tốt |
| Rubik | 400, 700 | Hơi tròn, thân thiện |
| Mulish | 400, 700 | Minimal |
| Ubuntu | 400, 700 | Nổi bật vừa phải |
| Cabin | 400, 700 | Humanist |
| Public Sans | 400, 700 | Chính phủ / tin cậy |
| Plus Jakarta Sans | 400, 700 | Trendy, startup |

#### Tier A — Serif nội dung (8 family)

| Family | Weights ship | Vai trò |
|--------|--------------|---------|
| Noto Serif | 400, 700 | Serif VN an toàn nhất |
| Merriweather | 400, 700 | Body serif ấm |
| Lora | 400, 700 | Cổ điển |
| Source Serif 4 | 400, 700 | Báo / tạp chí |
| IBM Plex Serif | 400, 700 | Formal |
| PT Serif | 400, 700 | Báo chí |
| Literata | 400, 700 | Sách / đoạn dài |
| Roboto Slab | 400, 700 | Slab headline + body |

#### Tier B — Tiêu đề & display (10 family)

| Family | Weights ship | Ghi chú |
|--------|--------------|---------|
| Lexend | 400, 700 | Tiêu đề dễ đọc |
| Oswald | 400, 700 | Condensed mạnh |
| Barlow Condensed | 400, 700 | Poster dọc hẹp ngang |
| Anton | 400 | All-caps display |
| Exo 2 | 400, 700 | Công nghệ / sale |
| Josefin Sans | 400, 700 | Vintage nhẹ |
| Raleway | 400, 700 | Elegant sans |
| Signika | 400, 700 | Tiêu đề ấm |
| Archivo | 400, 700 | Grotesk display |
| Montserrat | 700, 800 | Đã có; tier B vì một số dấu VN yếu — tooltip |

#### Tier B — Bo tròn / thân thiện (6 family)

| Family | Weights ship | Ghi chú |
|--------|--------------|---------|
| Nunito | 400, 700 | Tròn, F&B |
| Quicksand | 400, 700 | Mềm |
| Comfortaa | 400, 700 | Logo nhỏ |
| M PLUS Rounded 1c | 400, 700 | Nhật-VN, tròn |
| Baloo 2 | 400, 700 | Vui, trẻ em |
| Varela Round | 400 | Pill label |

#### Tier C — Trang trí & chữ tay (6 family)

| Family | Weights ship | Ghi chú UI |
|--------|--------------|------------|
| Caveat | 400, 700 | Chữ tay VN ổn |
| Satisfy | 400 | Chữ ký / slogan ngắn |
| Allison | 400 | Script mảnh |
| Shantell Sans | 400, 700 | Handwritten vui |
| Patrick Hand | 400 | Ghi chú tay |
| Dancing Script | 400 | Script; tooltip cụm ngắn |

**Tổng catalog:** **48 family**, **~96 file .ttf** (Regular + Bold; Be Vietnam Pro ~7 file).  
**Mục tiêu dropdown sau load:** ≥ **40 family** (cho phép vài file thiếu khi dev clone mỏng).

#### Quy ước đặt tên file

```
{FamilyNormalized}-{WeightLabel}.ttf
```

Ví dụ: `BeVietnamPro-Bold.ttf`, `NotoSans-Regular.ttf`, `BarlowCondensed-Bold.ttf`.  
`FONT_CATALOG` map `file → family + weight + style + tier + group`.

#### Script & README

- `scripts/fetch-brand-fonts.mjs`: tải từ Google Fonts API theo danh sách catalog; idempotent.
- `data/brand/fonts/README.md`: hướng dẫn chạy script, bản quyền OFL, chuỗi test VN.
- Font **không** commit vào git nếu repo quá nặng → tùy chọn `.gitattributes` + Git LFS; spec ưu tiên **ship đủ tier A** (~52 file) bắt buộc, tier B/C tải thêm qua script.

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

- `ensureFonts()` chạy một lần khi vào editor; đăng ký tuần tự (giữ logic hiện tại, tránh spike RAM).
- Ước lượng **~8–15 MB** toàn bộ tier A+B+C — chấp nhận được cho app desktop offline.
- Nếu file thiếu: bỏ qua im lặng; family không vào dropdown.
- Combobox font: **searchable** bắt buộc (48 mục — không cuộn mù).

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

- [ ] Sau `pnpm fetch:fonts` (hoặc script tương đương), dropdown ≥ **40 family**.
- [ ] Chuỗi test VN hiển thị đúng trên canvas với mẫu tier A (Be Vietnam Pro, Noto Sans, Inter, Noto Serif, Barlow Condensed).
- [ ] Tier C hiện tooltip cảnh báo; không crash khi gõ đoạn dài.
- [ ] Thumbnail + Tạo ảnh khớp font canvas.
- [ ] Không còn Arial/Georgia trong list nếu chưa bundle.

## 8. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|--------|-------------|
| Repo phình (~15 MB font) | Script tải; ship tier A trong repo, B+C qua `fetch:fonts`; Git LFS nếu cần |
| Montserrat / script tier C | Tier badge + tooltip; không dùng cho body dài |
| Dropdown 48 mục khó tìm | Combobox search + group + preview font |
| Drawer che canvas | Overlay + đóng nhanh; không bắt buộc mở liên tục |

## 9. Thứ tự triển khai gợi ý (cho writing-plans)

1. Layout shell: grid + toolbar thu gọn + RightRail stub.
2. ContextBar + gỡ Sắp xếp khỏi PropertiesPanel.
3. InspectorDrawer overlay + persist + Esc.
4. `fetch-brand-fonts.mjs` + catalog 48 family + Combobox search/preview/tier badge.
5. Kiểm thử chuỗi VN + thumbnail + Tạo ảnh.
6. Kiểm thử layout end-to-end.
