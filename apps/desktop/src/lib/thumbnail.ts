import * as fabric from "fabric";
import type { FabricScene } from "@genposter/schema";

import { ensureFonts } from "./fonts.js";

/** Render a small JPEG data URL preview of a page scene. */
export async function renderThumb(
  scene: FabricScene,
  width: number,
  height: number,
  maxW = 200,
): Promise<string> {
  await ensureFonts();
  const canvas = new fabric.StaticCanvas(undefined, {
    width,
    height,
    renderOnAddRemove: false,
  });
  try {
    await canvas.loadFromJSON(scene);
    // JPEG has no alpha — transparent scenes (old files without a saved
    // background) would come out black, so default to white.
    if (!canvas.backgroundColor && !canvas.backgroundImage) {
      canvas.backgroundColor = "#ffffff";
    }
    canvas.setDimensions({ width, height });
    canvas.renderAll();
    const multiplier = Math.min(1, maxW / Math.max(1, width));
    return canvas.toDataURL({
      format: "jpeg",
      quality: 0.7,
      multiplier,
      enableRetinaScaling: false,
    });
  } finally {
    canvas.dispose();
  }
}
