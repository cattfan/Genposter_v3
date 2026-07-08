import { Rect, Shadow, type Canvas, type FabricImage, type FabricObject, type TMat2D } from "fabric";

import { CUSTOM_PROPS, getBool, setProp } from "../../lib/fabric-util.js";

/** Extra workspace (px) around the page — bleed area, not a visible frame. */
export const PASTEBOARD_PAD = 600;
/** Matches `.stage` background — pasteboard is transparent so this shows through. */
export const PASTEBOARD_COLOR = "#e9eaee";

export function isPageFrame(obj: FabricObject): boolean {
  return getBool(obj, "gpPageFrame");
}

export function pageBounds(pageW: number, pageH: number) {
  return {
    left: PASTEBOARD_PAD,
    top: PASTEBOARD_PAD,
    width: pageW,
    height: pageH,
    right: PASTEBOARD_PAD + pageW,
    bottom: PASTEBOARD_PAD + pageH,
  };
}

export function editorCanvasSize(pageW: number, pageH: number) {
  return {
    width: pageW + 2 * PASTEBOARD_PAD,
    height: pageH + 2 * PASTEBOARD_PAD,
  };
}

export function canvasDimensions(pageW: number, pageH: number, zoom: number) {
  const base = editorCanvasSize(pageW, pageH);
  return {
    width: base.width * zoom,
    height: base.height * zoom,
  };
}

export function viewportTransform(_pageW: number, _pageH: number, zoom: number): TMat2D {
  void _pageW;
  void _pageH;
  // Objects already live in editor space (page coords + PASTEBOARD_PAD). Pan here would double-offset.
  return [zoom, 0, 0, zoom, 0, 0];
}

export function findPageFrame(canvas: Canvas): Rect | null {
  for (const obj of canvas.getObjects()) {
    if (isPageFrame(obj) && obj.type === "rect") return obj as Rect;
  }
  return null;
}

/** Normalize page background — empty/transparent → white (matches thumbnail export). */
export function normalizePageFill(value: unknown): string {
  if (typeof value !== "string") return "#ffffff";
  const v = value.trim();
  if (!v || v === PASTEBOARD_COLOR) return "#ffffff";
  if (v === "transparent" || v === "rgba(0,0,0,0)" || v === "rgb(0,0,0,0)") {
    return "#ffffff";
  }
  return v;
}

/** Read page fill from a serialized scene (Fabric v5/v6 field names). */
export function resolvePageFillFromScene(scene: Record<string, unknown>): string {
  if (typeof scene.backgroundColor === "string") {
    return normalizePageFill(scene.backgroundColor);
  }
  if (typeof scene.background === "string") {
    return normalizePageFill(scene.background);
  }
  return "#ffffff";
}

function readPageFillFromCanvas(canvas: Canvas): string {
  const bg = canvas.backgroundColor;
  if (typeof bg === "string") return normalizePageFill(bg);
  const legacy = (canvas as unknown as { background?: string }).background;
  if (typeof legacy === "string") return normalizePageFill(legacy);
  const frame = findPageFrame(canvas);
  if (frame && typeof frame.fill === "string") return normalizePageFill(frame.fill);
  return "#ffffff";
}

function applyPageFrameProps(frame: Rect, pageW: number, pageH: number, fill: string): void {
  const color = normalizePageFill(fill);
  frame.set({
    left: PASTEBOARD_PAD,
    top: PASTEBOARD_PAD,
    width: pageW,
    height: pageH,
    fill: color,
    strokeWidth: 0,
    selectable: false,
    evented: false,
    hasControls: false,
    objectCaching: false,
    dirty: true,
  });
  frame.setCoords();
}

export function ensurePageFrame(
  canvas: Canvas,
  pageW: number,
  pageH: number,
  fill = "#ffffff",
): Rect {
  let frame = findPageFrame(canvas);
  if (!frame) {
    frame = new Rect({
      left: PASTEBOARD_PAD,
      top: PASTEBOARD_PAD,
      width: pageW,
      height: pageH,
      fill: normalizePageFill(fill),
      strokeWidth: 0,
      selectable: false,
      evented: false,
      hasControls: false,
      lockMovementX: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      hoverCursor: "default",
      objectCaching: false,
      shadow: new Shadow({
        color: "rgba(0,0,0,0.12)",
        blur: 24,
        offsetX: 0,
        offsetY: 6,
      }),
    });
    setProp(frame, "gpPageFrame", true);
    canvas.add(frame);
  } else {
    applyPageFrameProps(frame, pageW, pageH, fill);
  }
  canvas.sendObjectToBack(frame);
  canvas.backgroundColor = PASTEBOARD_COLOR;
  return frame;
}

export function syncPageFrameSize(canvas: Canvas, pageW: number, pageH: number): void {
  const frame = findPageFrame(canvas);
  if (!frame) return;
  applyPageFrameProps(
    frame,
    pageW,
    pageH,
    typeof frame.fill === "string" ? frame.fill : "#ffffff",
  );
  canvas.sendObjectToBack(frame);
}

export function keepPageFrameAtBack(canvas: Canvas): void {
  const frame = findPageFrame(canvas);
  if (frame) canvas.sendObjectToBack(frame);
}

export function shiftObjects(canvas: Canvas, dx: number, dy: number): void {
  for (const obj of canvas.getObjects()) {
    if (isPageFrame(obj)) continue;
    obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy });
    obj.setCoords();
  }
}

export function shiftBackgroundImage(canvas: Canvas, dx: number, dy: number): void {
  const bg = canvas.backgroundImage as FabricImage | undefined;
  if (!bg) return;
  bg.set({ left: (bg.left ?? 0) + dx, top: (bg.top ?? 0) + dy });
}

export function shiftEditorToPageCoords(canvas: Canvas): void {
  shiftObjects(canvas, -PASTEBOARD_PAD, -PASTEBOARD_PAD);
  shiftBackgroundImage(canvas, -PASTEBOARD_PAD, -PASTEBOARD_PAD);
}

export function shiftPageToEditorCoords(canvas: Canvas): void {
  shiftObjects(canvas, PASTEBOARD_PAD, PASTEBOARD_PAD);
  shiftBackgroundImage(canvas, PASTEBOARD_PAD, PASTEBOARD_PAD);
}

type SceneJson = Record<string, unknown> & {
  objects?: Array<Record<string, unknown>>;
  backgroundImage?: Record<string, unknown>;
};

export function canvasToPageSceneJson(canvas: Canvas): SceneJson {
  shiftEditorToPageCoords(canvas);
  const frame = findPageFrame(canvas);
  const pageFill =
    frame && typeof frame.fill === "string"
      ? normalizePageFill(frame.fill)
      : readPageFillFromCanvas(canvas);
  const json = canvas.toObject([...CUSTOM_PROPS]) as SceneJson;
  json.objects = (json.objects ?? []).filter((o) => !o.gpPageFrame);
  json.backgroundColor = pageFill;
  delete json.background;
  if (json.backgroundImage) {
    json.backgroundImage.left = ((json.backgroundImage.left as number | undefined) ?? 0);
    json.backgroundImage.top = ((json.backgroundImage.top as number | undefined) ?? 0);
  }
  shiftPageToEditorCoords(canvas);
  return json;
}

export function applyPageViewport(canvas: Canvas, pageW: number, pageH: number, zoom: number): void {
  canvas.setDimensions(canvasDimensions(pageW, pageH, zoom));
  canvas.setViewportTransform(viewportTransform(pageW, pageH, zoom));
  const frame = findPageFrame(canvas);
  if (frame) {
    applyPageFrameProps(
      frame,
      pageW,
      pageH,
      typeof frame.fill === "string" ? frame.fill : "#ffffff",
    );
    canvas.sendObjectToBack(frame);
  }
  for (const obj of canvas.getObjects()) {
    obj.set("dirty", true);
  }
}
