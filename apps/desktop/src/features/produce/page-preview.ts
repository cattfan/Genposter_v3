import * as fabric from "fabric";
import type { FabricScene, TemplateSet } from "@genposter/schema";

import { ensureFonts } from "../../lib/fonts.js";

export interface ElementBox {
  id: string;
  /** Data group this element belongs to ("" = solo element). */
  dataGroupId: string;
  /** Normalized (0..1) coords relative to the page. */
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PagePreviewData {
  pageId: string;
  img: string;
  boxes: ElementBox[];
}

/** Render each page of a khuôn once: preview image + element bounding boxes. */
export async function renderPagePreviews(
  set: TemplateSet,
  maxW = 560,
): Promise<PagePreviewData[]> {
  await ensureFonts();
  const out: PagePreviewData[] = [];
  for (const p of set.pages) {
    const canvas = new fabric.StaticCanvas(undefined, {
      width: set.width,
      height: set.height,
      renderOnAddRemove: false,
    });
    try {
      const scene = (p.scene ?? { objects: [] }) as FabricScene;
      const { dataGroups: _dg, ...json } = scene;
      void _dg;
      await canvas.loadFromJSON(json);
      canvas.setDimensions({ width: set.width, height: set.height });
      canvas.renderAll();

      const boxes: ElementBox[] = [];
      for (const o of canvas.getObjects()) {
        const props = o as unknown as { id?: string; gpDataGroup?: string };
        if (!props.id) continue;
        const r = o.getBoundingRect();
        boxes.push({
          id: props.id,
          dataGroupId: typeof props.gpDataGroup === "string" ? props.gpDataGroup : "",
          left: r.left / set.width,
          top: r.top / set.height,
          width: r.width / set.width,
          height: r.height / set.height,
        });
      }

      let img: string;
      try {
        const multiplier = Math.min(1, maxW / Math.max(1, set.width));
        img = canvas.toDataURL({
          format: "jpeg",
          quality: 0.85,
          multiplier,
          enableRetinaScaling: false,
        });
      } catch {
        // Tainted canvas or similar: fall back to the saved page thumbnail.
        img = p.thumbnail ?? "";
      }
      out.push({ pageId: p.id, img, boxes });
    } finally {
      canvas.dispose();
    }
  }
  return out;
}
