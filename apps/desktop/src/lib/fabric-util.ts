import * as fabric from "fabric";

/** Custom object props serialized into templates and used for binding. */
export const CUSTOM_PROPS = ["id", "gpBind", "gpLabel", "gpListRow"] as const;

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

export function isTextType(obj: fabric.Object): boolean {
  const t = obj.type ?? "";
  return t === "textbox" || t === "i-text" || t === "text";
}

export function isImageType(obj: fabric.Object): boolean {
  return obj.type === "image";
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
export function fitImageCover(img: fabric.FabricImage, boxW: number, boxH: number): void {
  const natW = img.width || boxW;
  const natH = img.height || boxH;
  const scale = Math.max(boxW / natW, boxH / natH);
  img.set({ scaleX: scale, scaleY: scale, originX: "center", originY: "center" });
  img.clipPath = new fabric.Rect({
    width: boxW / scale,
    height: boxH / scale,
    originX: "center",
    originY: "center",
  });
}
