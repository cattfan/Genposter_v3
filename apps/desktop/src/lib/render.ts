import * as fabric from "fabric";
import type {
  ElementBinding,
  GenposterTemplate,
  ListRowConfig,
  Slide,
} from "@genposter/schema";

import { resolvePhoto, resolveText, type BindContext } from "./bind.js";
import { ensureDir, assetUrl, dataUrlToBytes, writeBytes } from "./fsx.js";
import { ensureFonts } from "./fonts.js";
import { fitImageCover, getId, isImageType, isTextType } from "./fabric-util.js";
import { join, paths } from "./paths.js";

function bindMap(bindings: ElementBinding[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const b of bindings) if (b.elementId && b.bind) m.set(b.elementId, b.bind);
  return m;
}

function bindForObject(
  obj: fabric.Object,
  binds: Map<string, string>,
): string {
  const id = getId(obj);
  const explicit = binds.get(id);
  if (explicit !== undefined) return explicit;
  const hint = (obj as unknown as { gpBind?: string }).gpBind;
  return hint ?? "";
}

async function applyBinding(
  obj: fabric.Object,
  bind: string,
  ctx: BindContext,
): Promise<void> {
  if (!bind) return;

  if (bind.startsWith("photo:")) {
    if (!isImageType(obj)) return;
    const path = resolvePhoto(bind, ctx);
    if (!path) return;
    const img = obj as fabric.FabricImage;
    const boxW = img.getScaledWidth();
    const boxH = img.getScaledHeight();
    const center = img.getCenterPoint();
    const angle = img.angle ?? 0;
    try {
      await img.setSrc(assetUrl(path), { crossOrigin: "anonymous" });
      fitImageCover(img, boxW, boxH);
      img.set({ angle });
      img.setPositionByOrigin(center, "center", "center");
      img.setCoords();
    } catch {
      // keep placeholder on failure
    }
    return;
  }

  if (isTextType(obj)) {
    const id = getId(obj);
    const text = resolveText(bind, ctx, id);
    (obj as fabric.Textbox).set({ text });
  }
}

/** Render one slide into an offscreen StaticCanvas using the template scene. */
export async function renderSlideCanvas(
  template: GenposterTemplate,
  slide: Slide,
  bindings: ElementBinding[],
  listRow: ListRowConfig | null,
): Promise<fabric.StaticCanvas> {
  const canvas = new fabric.StaticCanvas(undefined, {
    width: template.width,
    height: template.height,
    renderOnAddRemove: false,
  });
  await canvas.loadFromJSON(template.scene);
  canvas.setDimensions({ width: template.width, height: template.height });

  const binds = bindMap(bindings);
  const rowIds = new Set(listRow?.elementIds ?? []);
  const all = canvas.getObjects();
  const rowObjs = all.filter((o) => rowIds.has(getId(o)));
  const staticObjs = all.filter((o) => !rowIds.has(getId(o)));

  // Static + slide-level objects.
  for (const obj of staticObjs) {
    await applyBinding(obj, bindForObject(obj, binds), { slide });
  }

  // Repeating list rows.
  if (listRow && rowObjs.length) {
    const step = listRow.rowHeight + (listRow.gap ?? 0);
    const max = Math.min(slide.items.length, listRow.maxRows || slide.items.length);

    if (max <= 0) {
      for (const obj of rowObjs) canvas.remove(obj);
    } else {
      // Row 0 uses the original objects in place.
      for (const obj of rowObjs) {
        await applyBinding(obj, bindForObject(obj, binds), {
          slide,
          item: slide.items[0],
          n: 1,
        });
      }
      // Rows 1..max-1 are clones shifted down.
      for (let i = 1; i < max; i++) {
        for (const obj of rowObjs) {
          const clone = await obj.clone(["id", "gpBind", "gpLabel", "gpListRow"]);
          clone.set({ top: (obj.top ?? 0) + i * step });
          clone.setCoords();
          await applyBinding(clone, bindForObject(obj, binds), {
            slide,
            item: slide.items[i],
            n: i + 1,
          });
          canvas.add(clone);
        }
      }
    }
  }

  canvas.renderAll();
  return canvas;
}

export function canvasToJpegBytes(canvas: fabric.StaticCanvas, quality = 0.9): Uint8Array {
  const dataUrl = canvas.toDataURL({
    format: "jpeg",
    quality,
    multiplier: 1,
    enableRetinaScaling: false,
  });
  return dataUrlToBytes(dataUrl);
}

export function canvasToPngBytes(canvas: fabric.StaticCanvas): Uint8Array {
  const dataUrl = canvas.toDataURL({ format: "png", multiplier: 1, enableRetinaScaling: false });
  return dataUrlToBytes(dataUrl);
}

export interface RenderProgress {
  onProgress?: (done: number, total: number, file: string) => void;
}

/** Render all slides to disk; returns the written file paths. */
export async function renderAll(
  template: GenposterTemplate,
  payload: { slides: Slide[] },
  recipe: {
    id: string;
    bindings: ElementBinding[];
    listRow: ListRowConfig | null;
    output: { dir: string; format: "jpg" | "png"; quality: number };
  },
  opts: RenderProgress = {},
): Promise<{ outputDir: string; files: string[] }> {
  await ensureFonts();
  const outputDir = paths.outputSub(recipe.output.dir);
  await ensureDir(outputDir);

  const ext = recipe.output.format === "png" ? "png" : "jpg";
  const q = Math.min(1, Math.max(0.1, (recipe.output.quality ?? 90) / 100));
  const files: string[] = [];

  for (let i = 0; i < payload.slides.length; i++) {
    const slide = payload.slides[i]!;
    const canvas = await renderSlideCanvas(template, slide, recipe.bindings, recipe.listRow);
    const bytes =
      ext === "png" ? canvasToPngBytes(canvas) : canvasToJpegBytes(canvas, q);
    const name = `${template.id}_${String(slide.index).padStart(2, "0")}.${ext}`;
    const fp = join(outputDir, name);
    await writeBytes(fp, bytes);
    canvas.dispose();
    files.push(fp);
    opts.onProgress?.(files.length, payload.slides.length, fp);
    // Yield to the UI between slides.
    await new Promise((r) => setTimeout(r, 0));
  }

  return { outputDir, files };
}
