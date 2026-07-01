# Tab Tạo ảnh: Bộ khuôn nhiều trang + đổ dữ liệu random

- Ngày: 2026-07-01
- Trạng thái: Đã chốt thiết kế, chờ lên kế hoạch triển khai
- Liên quan: `2026-06-24-trang-tong-nhieu-trang-design.md` (bộ mẫu nhiều trang), `2026-06-24-copy-paste-data-groups-design.md` (nhóm dữ liệu)

## 1. Mục tiêu

Biến tab **Tạo ảnh** thành luồng: chọn **1 bộ mẫu nhiều trang** (= "bộ khuôn") → cấu hình gán thuộc tính cho từng trang → chọn nguồn dữ liệu → nhập số bộ muốn sinh → **Sinh & Xuất** ra 1 file zip, mỗi bộ 1 thư mục con chứa đủ ảnh các trang.

**Thành công khi:**

- Chọn được nguyên bộ mẫu (nhiều trang), không còn làm phẳng theo từng trang.
- Cấu hình "thuộc tính nào đổ field nào" theo **từng trang**, lưu vào Khuôn (Recipe) riêng — không ghi vào file thiết kế.
- Nhập K = số bộ; mỗi bộ là **1 lượt random độc lập**, không dòng dữ liệu nào lặp lại **trong cùng 1 bộ** (bất kể nằm ở trang nào); giữa các bộ khác nhau được phép trùng.
- Số dòng cần cho 1 bộ **tự tính** từ tổng các nhóm dữ liệu trên tất cả trang; hồ dữ liệu (sau lọc) thiếu thì chặn và báo rõ.
- Xuất 1 file `.zip` tên theo thời điểm; bên trong `bo1/anh1.jpg, anh2.jpg…`, `bo2/…`.

## 2. Phạm vi

**Trong phạm vi**

- Chọn bộ mẫu đầy đủ (TemplateSet), chọn/tạo/lưu Khuôn (Recipe).
- Nguồn dữ liệu: sheet + lọc theo cột/giá trị + giới hạn (giữ như hiện tại) = hồ ứng viên.
- Nhập K (số bộ) muốn sinh; lưu làm mặc định trong Khuôn.
- Random-fill: mỗi bộ xáo riêng, không lặp trong bộ; số slot/bộ tự tính từ `dataGroups` mọi trang.
- Cấu hình gán field theo từng trang (Accordion theo trang, tái dùng UI nhóm + đối tượng lẻ hiện có).
- Xuất zip theo thời điểm, cấu trúc `bo{k}/anh{trang}.{ext}`.
- Đổi nhãn UI "Preset" → "Khuôn".
- Bỏ hẳn cơ chế phân trang tuần tự cũ (`buildSlides`, `itemsPerSlide`, card "Hàng danh sách" ở Produce, `listRow` trong Recipe).

**Ngoài phạm vi (để sau)**

- Kiểu tuần tự/chia-hết-không-lặp (đã chốt: chỉ random đợt này).
- Bỏ bớt trang khi xuất (luôn xuất đủ N trang/bộ).
- Preview render trước khi xuất hàng loạt.
- Nhiều sheet/nguồn dữ liệu trong 1 lần sinh.
- Xuất kèm carousel/PDF; chỉ ảnh rời trong zip.

## 3. Mô hình dữ liệu (`packages/schema/src/index.ts`)

### 3.1 Recipe — sửa

| Field | Thay đổi |
|-------|----------|
| `templateId` | Id **bộ mẫu** (TemplateSet), bỏ hậu tố `::pageId`. |
| `data.itemsPerSlide` | **Bỏ** (số slot/bộ tự tính từ nhóm). |
| `listRow` + `ListRowConfig` | **Bỏ hẳn** khỏi Recipe và schema. |
| `photos.perSlide` → `photos.perSet` | Đổi tên; token ảnh chung chuyển `photo:slide:i` → `photo:set:i`. |
| `randomSetCount` | **Mới**: số bộ mặc định (số nguyên ≥ 1). |
| `bindings` | Giữ phẳng theo `elementId` (id unique toàn bộ mẫu). |

### 3.2 Kiểu sinh dữ liệu mới (thay `Slide`/`SlideItem`/`SlidePayload`)

```ts
/** Một dòng dữ liệu đã resolve (field phẳng + ảnh). */
export interface DataRow {
  photos: string[];
  [field: string]: unknown;
}

/** Dữ liệu gán cho một nhóm trên một trang trong một bộ. */
export interface GroupFill {
  groupId: string;
  rows: DataRow[]; // slot: 1 phần tử; repeat: nhiều phần tử
}

/** Một trang đã có dữ liệu trong một bộ. */
export interface GeneratedPage {
  pageId: string;
  groups: GroupFill[];
}

/** Một bộ = một lượt random đầy đủ mọi trang. */
export interface GeneratedSet {
  setIndex: number; // 1-based
  pages: GeneratedPage[];
  setPhotos: string[]; // ảnh chung cả bộ (token photo:set:i)
}

export interface GeneratePayload {
  recipeId: string;
  templateId: string;
  sheet: string;
  rowsNeededPerSet: number;
  sets: GeneratedSet[];
}
```

- `title`/`subtitle`/`page`/`pages` cấp-slide cũ **bỏ**. Nếu muốn hiển thị số bộ/trang trên poster về sau sẽ thêm token riêng — ngoài phạm vi đợt này.
- `SlideItem`/`Slide`/`SlidePayload` xoá khỏi schema (chỉ tab Tạo ảnh dùng).

## 4. Luồng UI tab Tạo ảnh

Bố cục dọc, thay thế `ProduceTab` hiện tại:

1. **Chọn bộ mẫu & Khuôn** (header):
   - Dropdown "Bộ mẫu" liệt kê `TemplateSet` (mỗi bộ 1 mục, không phẳng trang).
   - Dropdown "Khuôn" (Recipe) + nút "Khuôn mới" / "Lưu khuôn".
2. **Nguồn dữ liệu** (card): tên khuôn, Sheet, Lọc theo cột, Giá trị lọc, Giới hạn, Ảnh/mục, Ảnh/bộ. Bỏ "Số mục / slide".
3. **Số lượng xuất** (card): NumberInput K (số bộ) + dòng phụ "Mỗi bộ cần **N** dòng dữ liệu"; cảnh báo đỏ nếu hồ sau lọc < N.
4. **Cấu hình khuôn** (card, `full`): `Accordion` theo **từng trang** của bộ mẫu; mỗi item trang chứa `ProduceBindingsPanel` (nhóm dữ liệu + bảng đối tượng lẻ) như hiện tại nhưng phạm vi 1 trang.
5. **Sinh & Xuất** (thanh dưới): một nút chạy random-fill → render → nén zip; `Progress` (tổng = K × số trang); sau khi xong hiện danh sách ngắn K bộ (vài dòng đã dùng mỗi bộ) + nút "Mở thư mục".

Bỏ card "Hàng danh sách & Xuất" và nút "Dựng slide" tách rời.

## 5. Engine random-fill (`lib/build.ts` viết lại)

1. **Nạp khuôn**: đọc `TemplateSet` (`loadTemplateSet`), migrate `dataGroups` mỗi trang. Với mỗi trang gom `elements` (id, loại, bindHint) + `dataGroups` (kèm `pageId`).
2. **Tính slot/bộ**: duyệt theo thứ tự trang → thứ tự nhóm trong trang.
   - Nhóm `repeat`: cần `repeat.maxRows` dòng.
   - Nhóm `slot`: cần 1 dòng.
   - Tổng = `rowsNeededPerSet`. Ghi lại "kế hoạch" (danh sách nhóm cần bao nhiêu dòng, theo thứ tự) để chia nhất quán.
3. **Nạp dữ liệu**: `canonicalRows(sheet)` → lọc (`applyFilter`) → cắt `limit` → resolve ảnh mỗi dòng (`resolvePhotos`, dùng `photos.perItem`) → danh sách `DataRow[]` ứng viên.
4. **Chặn thiếu**: nếu `candidates.length < rowsNeededPerSet` → ném lỗi rõ ("Cần N dòng/bộ, chỉ có Y sau lọc").
5. **Sinh K bộ**: mỗi bộ:
   - Xáo (Fisher–Yates) bản copy `candidates`, lấy đúng `rowsNeededPerSet` dòng đầu.
   - Chia tuần tự theo "kế hoạch" bước 2 vào từng `GroupFill`.
6. **Ảnh chung bộ** (`photos.perSet`): gom `perSet` ảnh đầu (không trùng) từ các dòng đã chọn của bộ → token `photo:set:i`.
7. **AI bindings**: `applyAiBindings` chạy theo dòng của từng nhóm (giữ cơ chế `aiKey(elementId)` hiện có, ngữ cảnh là `DataRow`).

## 6. Render (`lib/render.ts` sửa)

- Hàm mới `renderPageCanvas(templateSet, page, generatedPage, recipe)`:
  - Load scene trang từ `TemplateSet.pages[].scene`.
  - Phần tử **lẻ** (không thuộc nhóm): bind như cũ nhưng ngữ cảnh không có `item` (chỉ `static:`, `photo:set:i`, `ai:` cấp bộ). `title/subtitle/page` cũ bỏ.
  - Nhóm `slot`: bind mỗi member với `groupFill.rows[0]`.
  - Nhóm `repeat`: member gốc = `rows[0]`; clone thêm cho `rows[1..]`, dịch `top += i*step` (giữ logic `repeatDataGroup` hiện tại), mỗi clone bind `rows[i]`.
- `BindContext` đổi: `{ row?: DataRow; setPhotos?: string[]; n?: number }` thay `{ slide, item, n }`. `resolveText`/`resolvePhoto` cập nhật token tương ứng (`item.<field>` đọc `ctx.row`, `photo:item:i` đọc `ctx.row.photos`, `photo:set:i` đọc `ctx.setPhotos`).
- `renderAll` lặp K bộ × trang, gọi `renderPageCanvas`, thu bytes vào bộ nhớ để nén (không ghi ảnh rời ra đĩa).

## 7. Xuất zip (`lib/zip.ts` mới)

- Dùng `fflate` (`zipSync`) gói toàn bộ bytes ảnh trong bộ nhớ.
- Cấu trúc trong zip: `bo{k}/anh{trang}.{ext}` (`k`, `trang` 1-based, pad 2 số).
- Tên file zip: `Genposter_YYYY-MM-DD_HH-MM.zip` (dùng `-` thay `:` cho hợp lệ Windows). Cho phép người dùng đổi thư mục lưu qua `plugin-dialog` (save dialog); mặc định `output/`.
- Ghi bằng `writeBytes`.

## 8. Thay đổi tầng lib & UI

| File | Thay đổi |
|------|----------|
| `packages/schema/src/index.ts` | Sửa `Recipe`; thêm `DataRow`/`GroupFill`/`GeneratedPage`/`GeneratedSet`/`GeneratePayload`; bỏ `Slide`/`SlideItem`/`SlidePayload`/`ListRowConfig`; token `photo:set`. |
| `lib/build.ts` | Viết lại thành engine random-fill (mục 5). |
| `lib/render.ts` | `renderPageCanvas` + `renderAll` theo bộ/trang; `BindContext` mới. |
| `lib/bind.ts` | `resolveText`/`resolvePhoto` theo `DataRow`/`setPhotos`. |
| `lib/zip.ts` | **Mới** — nén zip. |
| `lib/recipe-io.ts` | Bỏ `list_row`; thêm `random_set_count`; `perSlide`→`perSet`; `templateId` = set id. |
| `lib/template-io.ts` | Bỏ lớp làm phẳng theo trang; expose chọn nguyên `TemplateSet` (id set). Giữ `loadTemplateSet` cho engine. |
| `features/produce/elements.ts` | `extractElements` nhận nhiều trang → gắn `pageId`; bỏ `listRow`. |
| `features/produce/preset-utils.ts` | `Draft` bỏ `itemsPerSlide`/`listRowIds`/`rowHeight`/`gap`/`maxRows`; thêm `randomSetCount`; `perSlide`→`perSet`. |
| `features/produce/options.ts` | Ảnh: `photo:set:i` thay `photo:slide:i`. |
| `features/produce/ProduceTab.tsx` | Layout mới (mục 4); Accordion theo trang; 1 nút Sinh & Xuất. |
| `features/produce/ProduceBindingsPanel.tsx` | Nhận `pageId`/phạm vi 1 trang; giữ UI nhóm + đối tượng lẻ. |
| `apps/desktop/package.json` | Thêm `fflate`. |

## 9. Xử lý lỗi & ca biên

- Hồ dữ liệu < slot/bộ → chặn trước khi render, thông báo cần/có.
- Khuôn không có nhóm dữ liệu nào (0 slot) → vẫn xuất K bộ giống nhau (chỉ phần tử lẻ/static); cảnh báo nhẹ, không chặn.
- Nhóm `repeat` có `maxRows` lớn hơn số dòng còn lại: đã gộp vào tổng slot nên không xảy ra; nếu `maxRows` = 0 → nhóm bị bỏ qua (xoá member khi render, như logic hiện tại).
- Ảnh lỗi/thiếu: giữ placeholder (như `applyBinding` hiện tại).
- Tên zip trùng: thêm hậu tố `_2`, `_3`… nếu file đã tồn tại.
- K rất lớn (vd hàng nghìn) → zip trong RAM có thể nặng; đợt này chấp nhận, ghi chú giới hạn.

## 10. Kiểm thử (thủ công)

1. Bộ mẫu 2 trang (trang 1: 1 nhóm slot; trang 2: 1 nhóm repeat maxRows=5) → "Mỗi bộ cần 6 dòng".
2. Sheet 20 dòng, K=3 → zip có `bo1/ bo2/ bo3/`, mỗi bộ 2 ảnh; trong 1 bộ không dòng nào lặp.
3. Lọc còn 4 dòng, cần 6 → chặn, báo rõ.
4. K=1 vẫn ra 1 bộ.
5. Khuôn không nhóm → xuất K bộ, không lỗi.
6. Lưu khuôn → mở lại → K, sheet, binding, perSet giữ đúng.
7. Token `static:`, `item.<field>`, `photo:item:i`, `photo:set:i`, `ai:` render đúng theo dòng của nhóm.
8. Tên zip theo thời điểm, mở được, ảnh đúng.
9. `pnpm --filter @genposter/desktop typecheck` xanh.

## 11. Thứ tự triển khai đề xuất

1. Schema: kiểu mới + sửa Recipe + bỏ kiểu cũ.
2. `bind.ts` + `build.ts` (engine random-fill) + unit test nhỏ cho chia slot & không-lặp.
3. `render.ts` theo bộ/trang.
4. `zip.ts` + `renderAll` nén.
5. `recipe-io.ts` / `template-io.ts` / produce utils.
6. `ProduceTab.tsx` + `ProduceBindingsPanel.tsx` (UI theo trang, nút Sinh & Xuất).
7. Typecheck + kiểm thử thủ công.
