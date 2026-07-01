import * as fabric from "fabric";
import type {
  DataGroupDef,
  DataRow,
  ElementBinding,
  FabricScene,
  GeneratedPage,
  GeneratePayload,
  Recipe,
  TemplateSet,
} from "@genposter/schema";

import { resolvePhoto, resolveText, type BindContext } from "./bind.js";
import { CUSTOM_PROPS } from "./fabric-util.js";
import { ensureFonts } from "./fonts.js";
import { fitImageCover, getId, isImageType, isTextType } from "./fabric-util.js";
import { buildKhuonPlan } from "./khuon-plan.js";
import { groupMemberIdSet } from "./scene-groups.js";
import { dataUrlToBytes, assetUrl } from "./fsx.js";
import { makeZip } from "./zip.js";

const CLONE_PROPS = [...CUSTOM_PROPS];

function bindMap(bindings: ElementBinding[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const b of bindings) if (b.elementId && b.bind) m.set(b.elementId, b.bind);
  return m;
}

function bindForObject(obj: fabric.Object, binds: Map<string, string>): string {
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

function objectsById(canvas: fabric.StaticCanvas): Map<string, fabric.FabricObject> {
  const m = new Map<string, fabric.FabricObject>();
  for (const o of canvas.getObjects()) m.set(getId(o), o);
  return m;
}

async function bindSlotGroup(
  canvas: fabric.StaticCanvas,
  group: DataGroupDef,
  binds: Map<string, string>,
  row: DataRow,
  setPhotos: string[],
): Promise<void> {
  const byId = objectsById(canvas);
  for (const id of group.memberIds) {
    const obj = byId.get(id);
    if (!obj) continue;
    await applyBinding(obj, bindForObject(obj, binds), { row, n: 1, setPhotos });
  }
}

async function bindRepeatGroup(
  canvas: fabric.StaticCanvas,
  group: DataGroupDef,
  binds: Map<string, string>,
  rows: DataRow[],
  setPhotos: string[],
): Promise<void> {
  const step = (group.repeat?.rowHeight ?? 110) + (group.repeat?.gap ?? 0);
  const byId = objectsById(canvas);
  const members = group.memberIds
    .map((id) => byId.get(id))
    .filter((o): o is fabric.FabricObject => Boolean(o));
  if (!members.length || !rows.length) {
    for (const obj of members) canvas.remove(obj);
    return;
  }

  for (const obj of members) {
    await applyBinding(obj, bindForObject(obj, binds), { row: rows[0]!, n: 1, setPhotos });
  }

  for (let i = 1; i < rows.length; i++) {
    for (const obj of members) {
      const clone = await obj.clone(CLONE_PROPS);
      clone.set({ top: (obj.top ?? 0) + i * step });
      clone.setCoords();
      await applyBinding(clone, bindForObject(obj, binds), {
        row: rows[i]!,
        n: i + 1,
        setPhotos,
      });
      canvas.add(clone);
    }
  }
}

/** Render one page of one set into an offscreen StaticCanvas. */
export async function renderPageCanvas(
  width: number,
  height: number,
  scene: FabricScene,
  groups: DataGroupDef[],
  gen: GeneratedPage,
  setPhotos: string[],
  binds: Map<string, string>,
): Promise<fabric.StaticCanvas> {
  const groupIds = groupMemberIdSet(groups);
  const canvas = new fabric.StaticCanvas(undefined, {
    width,
    height,
    renderOnAddRemove: false,
  });
  const { dataGroups: _dg, ...canvasJson } = scene;
  void _dg;
  await canvas.loadFromJSON(canvasJson);
  canvas.setDimensions({ width, height });

  const fillByGroup = new Map(gen.groups.map((g) => [g.groupId, g.rows]));

  // Static objects (not part of any data group).
  for (const obj of canvas.getObjects()) {
    if (groupIds.has(getId(obj))) continue;
    await applyBinding(obj, bindForObject(obj, binds), { setPhotos });
  }

  for (const g of groups) {
    const rows = fillByGroup.get(g.id);
    if (!rows || !rows.length) continue;
    if (g.mode === "slot") {
      await bindSlotGroup(canvas, g, binds, rows[0]!, setPhotos);
    } else {
      await bindRepeatGroup(canvas, g, binds, rows, setPhotos);
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

/** Render every set×page to in-memory images and return zip bytes. */
export async function renderSetsToZip(
  set: TemplateSet,
  payload: GeneratePayload,
  recipe: Recipe,
  opts: RenderProgress = {},
): Promise<{ zipBytes: Uint8Array; fileCount: number }> {
  await ensureFonts();

  const plan = buildKhuonPlan(set);
  const pageById = new Map(plan.pages.map((p) => [p.pageId, p]));
  const binds = bindMap(recipe.bindings);

  const ext = recipe.output.format === "png" ? "png" : "jpg";
  const q = Math.min(1, Math.max(0.1, (recipe.output.quality ?? 90) / 100));

  const files: Record<string, Uint8Array> = {};
  const total = payload.sets.reduce((sum, s) => sum + s.pages.length, 0);
  let done = 0;

  for (const gset of payload.sets) {
    const folder = `bo${String(gset.setIndex).padStart(2, "0")}`;
    for (let pi = 0; pi < gset.pages.length; pi++) {
      const gpage = gset.pages[pi]!;
      const pp = pageById.get(gpage.pageId);
      if (!pp) continue;
      const canvas = await renderPageCanvas(
        set.width,
        set.height,
        pp.scene,
        pp.groups,
        gpage,
        gset.setPhotos,
        binds,
      );
      const bytes =
        ext === "png" ? canvasToPngBytes(canvas) : canvasToJpegBytes(canvas, q);
      const nameInZip = `${folder}/anh${String(pi + 1).padStart(2, "0")}.${ext}`;
      files[nameInZip] = bytes;
      canvas.dispose();
      done++;
      opts.onProgress?.(done, total, nameInZip);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return { zipBytes: makeZip(files), fileCount: done };
}
