import * as fabric from "fabric";

/** Custom object props serialized into templates and used for binding. */
export const CUSTOM_PROPS = [
  "id",
  "gpBind",
  "gpLabel",
  "gpListRow",
  "gpDataGroup",
  "gpLocked",
  "gpCornerRadius",
  "gpPageFrame",
] as const;

let counter = 0;

export function newId(prefix = "el"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

export function getId(obj: fabric.Object): string {
  const o = obj as unknown as { id?: string };
  if (!o.id) o.id = newId(obj.type ?? "el");
  return o.id;
}

export function isGroupObject(obj: fabric.Object): obj is fabric.Group {
  return obj.type === "group";
}

/**
 * Flatten a list of objects, descending into nested `fabric.Group` children
 * (created by "Nhóm layout"). Data groups / bindings key off object id, and
 * grouping for layout must not hide members from that lookup.
 */
export function flattenObjects(objects: fabric.Object[]): fabric.Object[] {
  const out: fabric.Object[] = [];
  for (const o of objects) {
    out.push(o);
    if (isGroupObject(o)) out.push(...flattenObjects(o.getObjects()));
  }
  return out;
}

export function getStr(obj: fabric.Object, key: string): string | undefined {
  const v = (obj as unknown as Record<string, unknown>)[key];
  return typeof v === "string" ? v : undefined;
}

export function getBool(obj: fabric.Object, key: string): boolean {
  return Boolean((obj as unknown as Record<string, unknown>)[key]);
}

export function setProp(obj: fabric.Object, key: string, value: unknown): void {
  (obj as unknown as Record<string, unknown>)[key] = value;
}

/** Apply gpLocked movement/transform constraints after load or paste. */
export function applyObjectLock(obj: fabric.Object): void {
  const locked = getBool(obj, "gpLocked");
  obj.set({
    lockMovementX: locked,
    lockMovementY: locked,
    lockScalingX: locked,
    lockScalingY: locked,
    lockRotation: locked,
    hasControls: !locked,
  });
}

export function isTextType(obj: fabric.Object): boolean {
  const t = obj.type ?? "";
  return t === "textbox" || t === "i-text" || t === "text";
}

export function isImageType(obj: fabric.Object): boolean {
  return obj.type === "image";
}

/** Textbox defaults to noScaleCache:false — keep vector text sharp when zooming. */
export function tuneTextForZoom(obj: fabric.Object): void {
  if (!isTextType(obj)) return;
  obj.set({ noScaleCache: true });
  obj.set("dirty", true);
}

export function tuneAllTextForZoom(canvas: fabric.Canvas): void {
  for (const obj of canvas.getObjects()) tuneTextForZoom(obj);
}

/** A neutral placeholder image data URL for image slots in the editor. */
export function placeholderDataUrl(w = 400, h = 300, label = "Ảnh"): string {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ece7e2";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#c9c2ba";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.fillStyle = "#8a8178";
  ctx.font = `bold ${Math.round(Math.min(w, h) / 8)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, w / 2, h / 2);
  return c.toDataURL("image/png");
}

/** Scale an image to cover a box (box dimensions in canvas px), centered + clipped. */
export function fitImageCover(
  img: fabric.FabricImage,
  boxW: number,
  boxH: number,
  cornerRadius = 0,
): void {
  const natW = img.width || boxW;
  const natH = img.height || boxH;
  const scale = Math.max(boxW / natW, boxH / natH);
  img.set({ scaleX: scale, scaleY: scale, originX: "center", originY: "center" });
  const clipW = boxW / scale;
  const clipH = boxH / scale;
  const r = Math.max(0, cornerRadius) / scale;
  img.clipPath = new fabric.Rect({
    width: clipW,
    height: clipH,
    originX: "center",
    originY: "center",
    rx: r,
    ry: r,
  });
}

export function getCornerRadius(obj: fabric.Object): number {
  const v = (obj as unknown as { gpCornerRadius?: number }).gpCornerRadius;
  return typeof v === "number" && v > 0 ? v : 0;
}

/** Re-apply cover fit + clip after resize or corner-radius change. */
export function refitImageClip(obj: fabric.Object): void {
  if (!isImageType(obj)) return;
  const img = obj as fabric.FabricImage;
  const boxW = img.getScaledWidth();
  const boxH = img.getScaledHeight();
  if (boxW <= 0 || boxH <= 0) return;
  fitImageCover(img, boxW, boxH, getCornerRadius(obj));
}
