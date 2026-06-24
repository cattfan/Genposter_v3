# Copy/paste thuộc tính + Nhóm dữ liệu (Data groups)

- Ngày: 2026-06-24
- Trạng thái: Đã chốt, đã triển khai

## 1. Mục tiêu

1. **Tab Thiết kế:** copy/paste **style** (appearance) giữa đối tượng — giống Figma “Copy/Paste properties”.
2. **Tab Tạo ảnh:** copy/paste **binding** (chuỗi `bind`, không đụng style canvas).
3. **Nhóm dữ liệu:** gom object thành một **bộ thông tin** (vd. 1 quán = tên + giá + ảnh); cấu hình produce theo nhóm; object lẻ vẫn bind tự do.
4. **Group layout (Fabric):** tuỳ chọn gom layout để kéo/căn cùng nhau — tách khỏi nhóm dữ liệu.

## 2. Phạm vi

**Trong phạm vi**

- Clipboard theo ngữ cảnh tab (design style / produce binding).
- Schema `gpDataGroup` + `dataGroups[]` trên scene/trang.
- UI gom/tách/đặt tên nhóm ở tab Thiết kế.
- UI cấu hình nhóm + copy binding ở tab Tạo ảnh.
- Render: object trong nhóm dùng cùng `item`; mode `repeat` nhân **cả nhóm**.
- Migrate `gpListRow` + `listRow.elementIds` cũ sang data group mode `repeat`.

**Ngoài phạm vi**

- Copy binding/style **giữa hai mẫu** khác nhau.
- System clipboard (JSON ngoài app) — chỉ clipboard phiên trong app.
- AI binding (`ai:`) ngoài copy chuỗi bind hiện có.
- Undo/redo cho thao tác gom nhóm ở produce (chỉ draft local).

## 3. Mô hình dữ liệu *(Phần 1 — đã chốt)*

### 3.1 Trên từng Fabric object

| Key | Ý nghĩa |
|-----|---------|
| `gpDataGroup` | Id nhóm dữ liệu, vd. `quan_1`. Bỏ trống = **object lẻ**. |
| `gpBind` / `gpLabel` | Gợi ý slot trong nhóm (giữ như hiện tại). |
| `gpListRow` | **Deprecated** — đọc khi load cũ, ghi mới qua nhóm. |

Thêm `gpDataGroup` vào `CUSTOM_PROPS` (`fabric-util.ts`, clone, export scene).

### 3.2 Trên scene / `TemplatePage`

Lưu trong `FabricScene` (key top-level, serialize cùng trang):

```ts
interface DataGroupDef {
  id: string;              // slug ổn định: "quan_1"
  label: string;           // "Quán 1" — UI
  memberIds: string[];     // id object; editor sync khi gom/tách
  layoutGroupId?: string;  // id Fabric Group nếu user bật group layout
  mode: "slot" | "repeat";
  /** mode slot: nhóm = 1 item cố định trên slide (items[itemIndex]) */
  itemIndex?: number;
  /** mode repeat: nhân cả nhóm dọc theo danh sách */
  repeat?: {
    rowHeight: number;
    gap: number;
    maxRows: number;
  };
}

interface FabricScene {
  objects: FabricObjectJSON[];
  dataGroups?: DataGroupDef[];
  // ... background, version
}
```

**Ngữ nghĩa**

- **Object lẻ:** bind độc lập (title, subtitle, ảnh slide…).
- **Nhóm mode `slot`:** mọi member resolve binding với **cùng** `slide.items[itemIndex]`.
- **Nhóm mode `repeat`:** hàng 0 = member gốc; hàng 1..N-1 = **clone cả nhóm** (giữ tương đối layout), mỗi hàng một `items[i]`.

### 3.3 Recipe (Tạo ảnh)

- `bindings: ElementBinding[]` — giữ per `elementId` (object lẻ + member trong nhóm).
- `listRow` — **deprecated**; migrate sang `DataGroupDef.mode === "repeat"`.
- Produce draft thêm cache `dataGroups` đọc từ template scene (không nhân bản vào recipe).

### 3.4 Migrate

Khi load scene/recipe cũ:

1. Mọi object `gpListRow === true` → gán cùng `gpDataGroup: "row_legacy"` (hoặc id sinh tự động).
2. Tạo một `DataGroupDef` mode `repeat` với `memberIds` = `listRow.elementIds`, copy `rowHeight/gap/maxRows`.
3. Tab Tạo ảnh: ẩn cột “Hàng DS” cho member đã thuộc nhóm.

## 4. Copy / paste *(Phần 2)*

### 4.1 Tab Thiết kế — Style clipboard

**Lưu trữ:** module `styleClipboard.ts` — biến phiên (ref), không localStorage.

**Copy (`copyStyle`):** từ object đang chọn, trích props theo **loại**:

| Loại | Props copy |
|------|------------|
| Text | `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `underline`, `fill`, `textAlign`, `lineHeight`, `charSpacing` |
| Hình chữ nhật / tròn | `fill`, `stroke`, `strokeWidth`, `opacity`, `rx`, `ry` (rect) |
| Line | `stroke`, `strokeWidth`, `opacity` |
| Image | `opacity`, `stroke`, `strokeWidth` (không copy src/crop) |

**Không copy:** `left`, `top`, `width`, `height`, `scale`, `angle`, `gpBind`, `gpLabel`, `gpDataGroup`, `id`.

**Paste (`pasteStyle`):** áp lên object đang chọn (hoặc **tất cả** trong multi-select). Bỏ qua key không tương thích loại (vd. paste text style lên rect → chỉ `fill`/`opacity` nếu có trong map chung).

**UX**

- Phím tắc: `Ctrl+Shift+C` / `Ctrl+Shift+V` (tránh đè `Ctrl+C` duplicate hệ thống).
- Context menu canvas: **Sao chép style** / **Dán style** (disabled nếu clipboard trống / loại không khớp).
- Inspector (đầu panel): hai nút icon tương ứng.

**Undo:** một lần `updateActive` / batch → vào undo stack hiện có.

### 4.2 Tab Tạo ảnh — Binding clipboard

**Lưu trữ:** `bindingClipboard.ts` — phiên trong tab Produce.

**Copy binding (một dòng):** lưu `{ bind: string }` từ `draft.bindings[elementId]`.

**Paste binding:** ghi vào dòng đang chọn; nếu multi-select trong bảng (tương lai) paste lần lượt.

**Copy binding nhóm:** lưu `Record<elementId, bind>` cho mọi member; **Paste vào nhóm khác** map theo **thứ tự member cùng loại** (text→text, image→image) nếu id khác; fallback: paste cùng index trong danh sách member.

**UX**

- Nút copy/paste trên mỗi hàng bảng “Đối tượng lẻ”.
- Trên card nhóm: **Sao chép binding nhóm** / **Dán binding nhóm**.
- Tooltip: “Chỉ binding — không ảnh hưởng style trên canvas”.

## 5. UI & luồng editor *(Phần 3)*

### 5.1 Tab Thiết kế

**Gom nhóm dữ liệu**

- Chọn ≥2 object → context menu **Gom nhóm dữ liệu…** (Modal: tên hiển thị + id slug).
- Object đã có nhóm → **Thêm vào nhóm…** / **Tách khỏi nhóm** / **Đổi tên nhóm**.
- Tab **Dữ liệu** (LeftPanel): khi chọn object — hiện badge nhóm; khi chọn nhiều object cùng nhóm — shortcut gom/tách.

**Group layout (Fabric)**

- Context menu: **Nhóm layout** / **Bỏ nhóm layout** (Fabric `Group` / ungroup) — độc lập `gpDataGroup`.
- Nếu vừa data group vừa layout group: lưu `layoutGroupId` trên `DataGroupDef`.

**Layers panel**

- Hiển thị prefix/badge tên nhóm dữ liệu (màu xám nhạt).

**Chế độ nhóm (design-time, optional preview)**

- Inspector khi chọn nhóm (chọn 1 member + “Chọn cả nhóm”): `mode` slot/repeat, `itemIndex`, repeat params — lưu vào `dataGroups[]` (produce dùng lại).

### 5.2 Tab Tạo ảnh

Hai vùng trong card “Gán dữ liệu”:

1. **Nhóm dữ liệu** — mỗi `DataGroupDef` một `Accordion`/Card:
   - Tên, mode (`slot` / `repeat`), `itemIndex` hoặc repeat settings.
   - Bảng con: member (label, bind Select, static/ai input) — giống hàng lẻ.
   - Nút copy/paste binding nhóm.

2. **Đối tượng lẻ** — bảng hiện tại, chỉ `elements.filter(e => !e.dataGroupId)`.

Bỏ cột **Hàng DS** (logic chuyển sang nhóm mode `repeat`).

### 5.3 Render (`render.ts`)

```
for static objects (no gpDataGroup):
  applyBinding(obj, bind, { slide })

for each DataGroupDef:
  if mode === "slot":
    ctx = { slide, item: slide.items[itemIndex ?? 0] }
    for member in members: applyBinding(member, bind, ctx)
  if mode === "repeat":
    row 0: members in place, ctx item items[0]
    rows 1..max-1: clone all members as group, shift top += i * step, ctx item items[i]
```

Clone nhóm: clone từng member, giữ offset tương đối so với bounding box nhóm (hoặc offset so với member gốc — chọn **offset so với min top/left của nhóm** để layout ổn định).

## 6. Kiến trúc module

| Module | Trách nhiệm |
|--------|-------------|
| `styleClipboard.ts` | Trích/ghép style theo loại object |
| `bindingClipboard.ts` | Clipboard bind / bind nhóm |
| `dataGroups.ts` | CRUD nhóm trên scene, sync memberIds, migrate listRow |
| `useEditor.ts` | `copyStyle`, `pasteStyle`, `createDataGroup`, `addToDataGroup`, … |
| `LeftPanel.tsx` / `CanvasContextMenu.tsx` | UI gom nhóm + copy style |
| `ProduceTab.tsx` | UI nhóm + binding clipboard |
| `elements.ts` | `dataGroupId` trên `ElementInfo` |
| `render.ts` | Resolve theo nhóm |
| `packages/schema` | Types `DataGroupDef`, cập nhật `FabricScene` |

## 7. Xử lý lỗi & biên

- Paste style khác loại: paste partial, không toast (hoặc tooltip nhẹ “Một số thuộc tính không áp dụng”).
- Gom nhóm <2 object: disabled.
- Xóa object: remove khỏi `memberIds`; nhóm 0 member → xóa `DataGroupDef`.
- `itemIndex` vượt `items.length` khi render: skip nhóm hoặc dùng item rỗng (giữ hành vi bind rỗng hiện tại).
- Recipe cũ không có `dataGroups` trong scene: vẫn chạy `listRow` đến khi mở và lưu lại mẫu.

## 8. Kiểm thử

**Thiết kế**

- [ ] Ctrl+Shift+C/V copy font/màu text sang text khác; không đổi vị trí.
- [ ] Paste style lên multi-select.
- [ ] Gom 3 object → `dataGroups` + `gpDataGroup` lưu trong template JSON.
- [ ] Fabric group layout + data group độc lập.

**Tạo ảnh**

- [ ] Bảng tách nhóm / lẻ; không còn cột Hàng DS.
- [ ] Copy/paste binding một dòng; copy/paste binding cả nhóm.
- [ ] Nhóm slot: 2 quán trên slide → 2 nhóm `itemIndex` 0 và 1.
- [ ] Nhóm repeat: poster list nhân cả khối tên+giá+ảnh.

**Render**

- [ ] Template cũ `gpListRow` vẫn render sau migrate.
- [ ] Object lẻ + nhóm slot + nhóm repeat trên cùng một slide.

## 9. Thứ tự triển khai đề xuất

1. Schema + `dataGroups.ts` + migrate load.
2. Style clipboard + UI tab Thiết kế.
3. UI gom nhóm tab Thiết kế.
4. Render theo nhóm.
5. Produce UI nhóm + binding clipboard.
6. Deprecate `gpListRow` UI + docs.
