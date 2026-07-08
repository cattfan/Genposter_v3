import type * as fabric from "fabric";
import { Box } from "@mantine/core";

import { getStr, isTextType } from "../../lib/fabric-util.js";

function colorOf(fill: unknown, fallback = "#cccccc"): string {
  if (typeof fill === "string" && fill.startsWith("#")) return fill;
  return fallback;
}

function imageSrc(obj: fabric.FabricObject): string | null {
  const img = obj as fabric.FabricImage;
  if (typeof img.getSrc === "function") {
    const src = img.getSrc();
    if (src) return src;
  }
  const el = img.getElement?.() as HTMLImageElement | undefined;
  if (el?.src) return el.src;
  return null;
}

export function LayerPreview({ obj }: { obj: fabric.FabricObject }) {
  const type = (obj.type ?? "obj").toLowerCase();

  if (type === "image") {
    const src = imageSrc(obj);
    if (src) {
      return (
        <Box className="layer-thumb">
          <img src={src} alt="" />
        </Box>
      );
    }
    return <Box className="layer-thumb layer-thumb--muted">IMG</Box>;
  }

  if (isTextType(obj)) {
    const text = String((obj as fabric.Textbox).text ?? "").trim();
    const preview = text.slice(0, 3) || "Aa";
    return (
      <Box className="layer-thumb layer-thumb--text" title={text}>
        {preview}
      </Box>
    );
  }

  if (type === "rect" || type === "circle") {
    return (
      <Box
        className="layer-thumb"
        style={{ background: colorOf(obj.fill, "#ff6600") }}
      />
    );
  }

  if (type === "line") {
    return (
      <Box
        className="layer-thumb layer-thumb--line"
        style={{ background: colorOf(obj.stroke, "#1f1d1b") }}
      />
    );
  }

  const label = getStr(obj, "gpLabel") || type.slice(0, 3).toUpperCase();
  return <Box className="layer-thumb layer-thumb--muted">{label.slice(0, 3)}</Box>;
}
