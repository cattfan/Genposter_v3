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

function membersOf(canvas: fabric.StaticCanvas, group: DataGroupDef): fabric.FabricObject[] {
  const byId = objectsById(canvas);
  return group.memberIds
    .map((id) => byId.get(id))
    .filter((o): o is fabric.FabricObject => Boolean(o));
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
  const members = membersOf(canvas, group);
  if (!members.length || !rows.length) {
    for (const obj of members) canvas.remove(obj);
    return;
  }

  // Clone from the still-unbound originals first, so a row without a photo
  // falls back to the design placeholder rather than inheriting row 0's image.
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

  for (const obj of members) {
    await applyBinding(obj, bindForObject(obj, binds), { row: rows[0]!, n: 1, setPhotos });
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
    if (!rows || !rows.length) {
      // Group with no assigned rows (e.g. repeat maxRows=0): drop its members
      // so design-time placeholders don't leak into the export.
      for (const obj of membersOf(canvas, g)) canvas.remove(obj);
      continue;
    }
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

export interface RenderedPage {
  bytes: Uint8Array;
  /** Object URL for on-screen preview; revoke via revokeRenderedSets. */
  previewUrl: string;
}

export interface RenderedSet {
  setIndex: number;
  pages: RenderedPage[];
}

/**
 * Render every set×page to in-memory images once. The bytes are reused for
 * the zip export so deselecting/exporting never re-renders.
 */
export async function renderSets(
  set: TemplateSet,
  payload: GeneratePayload,
  recipe: Recipe,
  opts: RenderProgress = {},
): Promise<RenderedSet[]> {
  await ensureFonts();

  const plan = buildKhuonPlan(set);
  const pageById = new Map(plan.pages.map((p) => [p.pageId, p]));
  const binds = bindMap(recipe.bindings);

  const ext = recipe.output.format === "png" ? "png" : "jpg";
  const mime = ext === "png" ? "image/png" : "image/jpeg";
  const q = Math.min(1, Math.max(0.1, (recipe.output.quality ?? 90) / 100));

  const total = payload.sets.reduce((sum, s) => sum + s.pages.length, 0);
  let done = 0;
  const out: RenderedSet[] = [];

  for (const gset of payload.sets) {
    const pages: RenderedPage[] = [];
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
      canvas.dispose();
      // Copy into a plain ArrayBuffer-backed view to satisfy BlobPart typing.
      const view = new Uint8Array(bytes);
      const previewUrl = URL.createObjectURL(new Blob([view.buffer], { type: mime }));
      pages.push({ bytes, previewUrl });
      done++;
      opts.onProgress?.(done, total, `bo${gset.setIndex}/anh${pi + 1}`);
      await new Promise((r) => setTimeout(r, 0));
    }
    out.push({ setIndex: gset.setIndex, pages });
  }

  return out;
}

/** Free the object URLs held by rendered sets. */
export function revokeRenderedSets(rendered: RenderedSet[]): void {
  for (const s of rendered) {
    for (const p of s.pages) URL.revokeObjectURL(p.previewUrl);
  }
}

/**
 * Zip the given (already rendered, user-selected) sets. Each set folder gets
 * its caption.txt when a non-empty caption exists.
 */
export function zipRendered(
  rendered: RenderedSet[],
  captions: Record<number, string>,
  format: "jpg" | "png",
): { zipBytes: Uint8Array; fileCount: number } {
  const ext = format === "png" ? "png" : "jpg";
  const files: Record<string, Uint8Array> = {};
  let count = 0;

  for (const s of rendered) {
    const folder = `bo${String(s.setIndex).padStart(2, "0")}`;
    for (let i = 0; i < s.pages.length; i++) {
      files[`${folder}/anh${String(i + 1).padStart(2, "0")}.${ext}`] = s.pages[i]!.bytes;
      count++;
    }
    const cap = (captions[s.setIndex] ?? "").trim();
    if (cap) {
      files[`${folder}/caption.txt`] = new TextEncoder().encode(cap + "\n");
      count++;
    }
  }

  return { zipBytes: makeZip(files), fileCount: count };
}
