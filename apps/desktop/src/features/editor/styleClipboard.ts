import type * as fabric from "fabric";

import { isImageType, isTextType } from "../../lib/fabric-util.js";

export type StyleKind = "text" | "shape" | "line" | "image" | "unknown";

const TEXT_KEYS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "underline",
  "fill",
  "textAlign",
  "lineHeight",
  "charSpacing",
] as const;

const SHAPE_KEYS = ["fill", "stroke", "strokeWidth", "opacity", "rx", "ry"] as const;
const LINE_KEYS = ["stroke", "strokeWidth", "opacity"] as const;
const IMAGE_KEYS = ["opacity", "stroke", "strokeWidth"] as const;
const SHARED_KEYS = ["fill", "stroke", "strokeWidth", "opacity"] as const;

let stored: { kind: StyleKind; props: Record<string, unknown> } | null = null;

export function styleKind(obj: fabric.FabricObject): StyleKind {
  if (isTextType(obj)) return "text";
  if (isImageType(obj)) return "image";
  if (obj.type === "line") return "line";
  if (obj.type === "rect" || obj.type === "circle") return "shape";
  return "unknown";
}

function keysForKind(kind: StyleKind): readonly string[] {
  switch (kind) {
    case "text":
      return TEXT_KEYS;
    case "shape":
      return SHAPE_KEYS;
    case "line":
      return LINE_KEYS;
    case "image":
      return IMAGE_KEYS;
    default:
      return SHARED_KEYS;
  }
}

function pickProps(obj: fabric.FabricObject, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = (obj as unknown as Record<string, unknown>)[k];
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export function copyStyleFrom(obj: fabric.FabricObject): boolean {
  const kind = styleKind(obj);
  if (kind === "unknown") return false;
  stored = { kind, props: pickProps(obj, keysForKind(kind)) };
  return true;
}

export function hasStoredStyle(): boolean {
  return stored !== null;
}

export function pasteStyleTo(obj: fabric.FabricObject): Record<string, unknown> | null {
  if (!stored) return null;
  const targetKind = styleKind(obj);
  const keys =
    stored.kind === targetKind
      ? keysForKind(stored.kind)
      : SHARED_KEYS.filter((k) => k in stored!.props);
  const patch: Record<string, unknown> = {};
  for (const k of keys) {
    if (stored.props[k] !== undefined) patch[k] = stored.props[k];
  }
  return Object.keys(patch).length ? patch : null;
}
