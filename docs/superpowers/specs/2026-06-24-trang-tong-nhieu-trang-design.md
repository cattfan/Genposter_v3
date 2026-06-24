# Trang tổng + Mẫu nhiều trang (tab Thiết kế)

- Ngày: 2026-06-24
- Trạng thái: Đã chốt thiết kế, chờ lên kế hoạch triển khai
- Mockup tham khảo: `design-overview.png` (Trang tổng), `design-editor.png` (Trình sửa) — sinh trong quá trình brainstorm.

## 1. Mục tiêu

Biến tab **Thiết kế** từ trình sửa một-thiết-kế-một-lúc thành mô hình 3 cấp:

```
Trang tổng (Design home)
  └─ nhiều Mẫu (TemplateSet)
        └─ mỗi Mẫu gồm nhiều Trang (TemplatePage), mỗi trang là một canvas Fabric
```

Người dùng theo dõi nhiều mẫu ở một trang tổng; mỗi mẫu hiển thị thành một hàng ngang các trang. Mở một mẫu để chỉnh sửa từng trang, có dải trang để thêm/sắp xếp.

## 2. Phạm vi

**Trong phạm vi đợt này**

- Mô hình dữ liệu Mẫu/Trang + lưu trữ một-file-mỗi-mẫu + di trú dữ liệu cũ.
- Màn Trang tổng: lưới mẫu, mỗi mẫu một card có dải trang cuộn ngang, các thao tác cơ bản.
- Trình sửa nhiều trang: canvas theo kích thước mẫu, dải trang ở đáy, mô hình lưu/auto-lưu, undo/redo theo từng trang.
- Lớp tương thích để tab **Tạo ảnh** không vỡ.

**Ngoài phạm vi (để đợt sau)**

- Xuất "cả mẫu = carousel nhiều trang" theo nhóm dữ liệu.
- Nâng cấp trang trí editor: font kiểu script, chèn icon vào canvas, bo góc/clip ảnh, hoạ tiết vector.
- Tìm kiếm/lọc mẫu, gắn tag, chọn ảnh bìa thủ công, dark mode.

## 3. Mô hình dữ liệu & lưu trữ

### 3.1 Kiểu mới trong `packages/schema/src/index.ts`

```ts
export interface TemplatePage {
  id: string;            // id ổn định của trang (slug + hậu tố)
  name?: string;         // "Bìa", "Trang 2"… tự đặt nếu trống
  scene: FabricScene;    // canvas Fabric như hiện tại
  thumbnail?: string;    // ảnh xem trước nhỏ (data URL JPEG, rộng ~200px)
}

export interface TemplateSet {
  id: string;
  name: string;
  width: number;         // dùng chung mọi trang
  height: number;
  pages: TemplatePage[]; // luôn có >= 1 trang
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_TEMPLATE_W = 1588;
export const DEFAULT_TEMPLATE_H = 2248;
```

- Giữ nguyên `GenposterTemplate` (id, name, width, height, scene) làm **hợp đồng "trang có thể render"** cho `render.ts` và tab Tạo ảnh. `CANVAS_W/CANVAS_H` cũ chỉ còn là default cũ; default mẫu mới dùng `DEFAULT_TEMPLATE_W/H`.

### 3.2 Lưu trữ

- Mỗi mẫu một file: `templates/<mau-id>.json` = `TemplateSet` (kèm scene + thumbnail từng trang).
- `paths.ts` giữ `templatesDir()` và `template(id)` như cũ (giờ trỏ tới file mẫu).

### 3.3 Di trú dữ liệu cũ

- File template cũ là một `GenposterTemplate` đơn (có `scene`, không có `pages`).
- Khi đọc thư mục templates: nếu file **không có** mảng `pages` nhưng **có** `scene` → coi là mẫu-1-trang trong bộ nhớ:
  `{ id, name, width, height, pages: [{ id: "p1", scene, thumbnail }] }`.
- Không sửa file gốc ngay; lần **Lưu** kế tiếp sẽ ghi đè theo format mới (`pages`).

## 4. Kiến trúc UI & điều hướng

- Tab Thiết kế có state `openMauId: string | null`.
  - `null` → hiện **`DesignHome`** (trang tổng). Đây là màn mặc định.
  - có giá trị → hiện **`EditorTab`** (trình sửa) cho mẫu đó.
- Giữ thủ thuật **EditorTab luôn mounted** (ẩn/hiện bằng `display`) để không mất canvas; `DesignHome` cùng tab, ẩn/hiện theo `openMauId`.
- Component bao ngoài (đề xuất): `DesignWorkspace` quản lý `openMauId` + mẫu đang mở, render `DesignHome` hoặc `EditorTab`.

Luồng:

```
Vào tab Thiết kế → Trang tổng
  ├─ [Tạo mẫu mới] → Modal nhập tên (trống → "Mẫu mới (N)") + kích thước (mặc định 1588×2248)
  │     → tạo mẫu 1 trang trống → openMauId = id → vào trình sửa
  └─ Bấm 1 mẫu / 1 trang → openMauId = id (+ trang) → vào trình sửa đúng trang
Trình sửa
  └─ [← Trang tổng] → exportScene trang hiện tại + ghi file → openMauId = null
```

## 5. Trang tổng (`DesignHome`)

Bố cục (xem `design-overview.png`):

- Header: tiêu đề "Mẫu của bạn" + `Button` cam **"+ Tạo mẫu mới"**.
- Danh sách dọc các mẫu; mỗi mẫu là `Card`:
  - Header card: tên mẫu (đậm) + `Text` số trang + `Menu` (`⋯`): **Đổi tên / Nhân bản / Xoá mẫu**.
  - Thân: `ScrollArea` ngang chứa các thẻ **thumbnail trang** đúng tỉ lệ canvas (dùng `AspectRatio`), mỗi thẻ có badge số trang; bấm → mở trình sửa tại trang đó. Cuối dải có ô **"+ Thêm trang"** (tạo trang trống rồi mở).
- Trạng thái rỗng: khi chưa có mẫu nào → minh hoạ + nút "Tạo mẫu mới".
- Xác nhận **Xoá mẫu** bằng `Modal`/`confirm`.

Quản lý trang sâu (nhân bản/xoá/kéo sắp xếp) **không** nằm ở trang tổng — chỉ ở dải trang trong trình sửa.

## 6. Trình sửa nhiều trang (`EditorTab`)

Bố cục (xem `design-editor.png`): thanh công cụ • 3 cột (panel trái – canvas – thuộc tính) • dải trang ở đáy.

### 6.1 Kích thước canvas động

- `useEditor` nhận kích thước động thay vì hằng `CANVAS_W/H`:
  - Thêm API `setCanvasSize(w, h)` (gọi `canvas.setDimensions` + tính lại zoom-fit) hoặc nhận `width/height` khi nạp trang.
  - Các hàm dùng kích thước: `applyZoom`, `align` (căn giữa/phải/dưới), `distribute`, `setBackgroundImageDataUrl` (scale full-bleed), `newDesign`, init.
- Mở mẫu/đổi trang: `setCanvasSize(mau.width, mau.height)` → `loadScene(page.scene)`.

### 6.2 Dải trang (page strip)

- Thanh ngang ở đáy trình sửa, `ScrollArea` ngang các thumbnail trang; trang hiện tại **viền cam**.
- Thao tác:
  - Bấm thumbnail → **chuyển trang**: trước khi đổi gọi `exportScene()` ghi vào `pages[cur].scene` + sinh lại thumbnail; rồi `loadScene` trang mới (reset undo/redo cho trang mới).
  - Ô **"+ Thêm trang"** → trang trống mới (cùng kích thước mẫu), chuyển tới nó.
  - Menu mỗi trang: **Nhân bản** (copy scene + id mới), **Xoá** (không cho xoá nếu chỉ còn 1 trang; nếu xoá trang đang mở thì nhảy sang trang kề).
  - **Kéo để sắp xếp** thứ tự trang (đổi vị trí trong `pages`).

### 6.3 Thanh công cụ

- Thêm: **← Trang tổng**, ô **tên mẫu** (đổi tên mẫu), nhãn **Trang k/n**.
- Bỏ: nút **"Mở mẫu"** cũ (đã thay bằng trang tổng) và modal mở template cũ.
- Giữ: cụm Thêm phần tử (Menu), undo/redo, zoom, **Lưu mẫu**.

### 6.4 Mô hình lưu

- Mẫu đang mở giữ trong state của `DesignWorkspace` (bộ nhớ).
- Ghi vào bộ nhớ (`pages[cur].scene` + thumbnail) khi: đổi trang, bấm ← Trang tổng, bấm Lưu.
- **Lưu mẫu** ghi cả file `templates/<id>.json` (qua `saveTemplateSet`). Bấm **← Trang tổng** cũng tự ghi file để tránh mất.
- Undo/redo theo **từng trang** (đổi trang reset stack — đã hợp với `useEditor` hiện tại vì `loadScene` seed lại history).

## 7. Thay đổi tầng lib

- `packages/schema`: thêm `TemplatePage`, `TemplateSet`, `DEFAULT_TEMPLATE_W/H`.
- **Mới** `apps/desktop/src/lib/templateset-io.ts`:
  - `listTemplateSets(): TemplateSetSummary[]` (id, name, width, height, pageCount, coverThumb, updatedAt) — đọc file, áp di trú.
  - `loadTemplateSet(id): TemplateSet`.
  - `saveTemplateSet(set): string` (slug id + collision suffix, set `updatedAt`).
  - `deleteTemplateSet(id)`, `duplicateTemplateSet(id)`.
  - `nextUntitledName(existing): string` → "Mẫu mới (N)".
- **Mới** `apps/desktop/src/lib/thumbnail.ts`: `renderThumb(scene, w, h): Promise<string>` dùng Fabric `StaticCanvas` nhỏ (rộng ~200px) xuất JPEG data URL. (Tách từ logic `render.ts`.)
- `useEditor.ts`: thêm `setCanvasSize`; rời các hằng `CANVAS_W/H` sang biến kích thước hiện hành.

## 8. Tương thích tab Tạo ảnh

- Định danh trang để render/bind: chuỗi `"<mauId>::<pageId>"`.
- `template-io.ts` thành **lớp tương thích** cho Produce:
  - `listTemplates()` → dàn phẳng mọi mẫu thành các mục `{ id: "<mauId>::<pageId>", name: "<TênMẫu> · <TênTrang> (k/n)", width, height }`.
  - `loadTemplate(ref)` → tách `mauId::pageId`, trả `GenposterTemplate` = `{ id: ref, name, width, height, scene }` (lấy `width/height` từ mẫu) → `render.ts` chạy nguyên.
  - Recipe cũ trỏ `templateId` là id template đơn → ánh xạ sang `"<id>::p1"` của mẫu đã di trú.
- `render.ts` đã dùng `template.width/height` → tự khớp kích thước mẫu, không phải sửa.

## 9. Xử lý lỗi & ca biên

- File mẫu phình to → thumbnail nén nhỏ (~rộng 200px JPEG), sinh khi lưu.
- Đổi trang không mất sửa → `exportScene` vào bộ nhớ trước khi đổi; tận dụng cờ `restoring` của `useEditor`.
- Đổi kích thước canvas giữa chừng → `setDimensions` + tính lại zoom-fit.
- Mẫu luôn có >= 1 trang → chặn xoá trang cuối; xoá trang đang mở → nhảy trang kề.
- Đổi tên/nhân bản mẫu → id mới qua `slugify` + hậu tố tránh trùng.
- File mẫu hỏng/parse lỗi → bỏ qua mục đó ở trang tổng (như `listTemplates` hiện tại).

## 10. Kiểm thử (thủ công)

1. Tạo mẫu (để trống tên → "Mẫu mới (N)") → vào trình sửa, canvas đúng 1588×2248.
2. Thêm/nhân bản/xoá/kéo sắp xếp trang; chặn xoá trang cuối.
3. Sửa trang A → đổi sang B → quay lại A vẫn giữ nguyên.
4. Lưu mẫu → reload app → mẫu + trang + thumbnail hiện đúng ở trang tổng.
5. Bấm 1 trang ở trang tổng → mở đúng trang.
6. Đổi tên / nhân bản / xoá mẫu.
7. Tab Tạo ảnh vẫn liệt kê được các trang và xuất ảnh.
8. `pnpm --filter @genposter/desktop typecheck` + `build` xanh.

## 11. Danh sách file dự kiến đụng tới

- `packages/schema/src/index.ts` — thêm kiểu + default size.
- `apps/desktop/src/lib/templateset-io.ts` — **mới**.
- `apps/desktop/src/lib/thumbnail.ts` — **mới**.
- `apps/desktop/src/lib/template-io.ts` — chuyển thành lớp tương thích Produce.
- `apps/desktop/src/features/editor/useEditor.ts` — kích thước động.
- `apps/desktop/src/features/editor/DesignWorkspace.tsx` — **mới** (quản lý openMauId).
- `apps/desktop/src/features/editor/DesignHome.tsx` — **mới** (trang tổng).
- `apps/desktop/src/features/editor/PageStrip.tsx` — **mới** (dải trang).
- `apps/desktop/src/features/editor/EditorTab.tsx` — nhận mẫu/trang, bỏ modal mở cũ, thêm ← Trang tổng + tên mẫu + Trang k/n.
- `apps/desktop/src/features/editor/Toolbar.tsx` — cập nhật nút.
- `apps/desktop/src/App.tsx` — tab "Thiết kế" render `DesignWorkspace`.
- `apps/desktop/src/features/editor/editor.css` — layout dải trang + trang tổng.
```
