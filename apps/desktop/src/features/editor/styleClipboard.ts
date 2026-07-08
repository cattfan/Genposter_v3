import { Shadow } from "fabric";
import type * as fabric from "fabric";

import { isImageType, isTextType, setProp } from "../../lib/fabric-util.js";

export type StyleKind = "text" | "shape" | "line" | "image" | "unknown";

const COMMON_KEYS = ["opacity", "angle", "flipX", "flipY", "shadow"] as const;

const TEXT_KEYS = [
  ...COMMON_KEYS,
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "underline",
  "linethrough",
  "fill",
  "textAlign",
  "lineHeight",
  "charSpacing",
  "stroke",
  "strokeWidth",
  "originX",
  "originY",
  "width",
  "scaleX",
  "scaleY",
] as const;

const SHAPE_KEYS = [
  ...COMMON_KEYS,
  "fill",
  "stroke",
  "strokeWidth",
  "rx",
  "ry",
  "scaleX",
  "scaleY",
] as const;

const LINE_KEYS = [...COMMON_KEYS, "stroke", "strokeWidth"] as const;

const IMAGE_KEYS = [...COMMON_KEYS, "stroke", "strokeWidth", "gpCornerRadius", "scaleX", "scaleY"] as const;

const SHARED_KEYS = [
  "fill",
  "stroke",
  "strokeWidth",
  "opacity",
  "angle",
  "shadow",
  "flipX",
  "flipY",
] as const;

const SHAPE_TYPES = new Set([
  "rect",
  "circle",
  "path",
  "polygon",
  "polyline",
  "triangle",
  "ellipse",
]);

let stored: { kind: StyleKind; props: Record<string, unknown> } | null = null;

export function resolveStyleTarget(obj: fabric.FabricObject): fabric.FabricObject {
  if (obj.type === "activeSelection") {
    const objs = (obj as fabric.ActiveSelection).getObjects();
    if (objs.length >= 1) return resolveStyleTarget(objs[0]!);
    return obj;
  }
  if (obj.type === "group") {
    const children = (obj as fabric.Group).getObjects();
    const visual = children.find(
      (c) =>
        isTextType(c) ||
        isImageType(c) ||
        c.type === "line" ||
        (c.type != null && SHAPE_TYPES.has(c.type)) ||
        c.fill != null ||
        c.stroke != null,
    );
    if (visual) return resolveStyleTarget(visual);
  }
  return obj;
}

export function styleKind(obj: fabric.FabricObject): StyleKind {
  const target = resolveStyleTarget(obj);
  if (isTextType(target)) return "text";
  if (isImageType(target)) return "image";
  const t = target.type ?? "";
  if (t === "line") return "line";
  if (t === "group" || SHAPE_TYPES.has(t)) return "shape";
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

function readProp(obj: fabric.FabricObject, key: string): unknown {
  const rec = obj as unknown as Record<string, unknown> & { get?: (k: string) => unknown };
  if (typeof rec.get === "function") {
    try {
      const v = rec.get(key);
      if (v !== undefined) return v;
    } catch {
      /* ignore */
    }
  }
  return rec[key];
}

function cloneStoredValue(key: string, value: unknown): unknown {
  if (key === "shadow") {
    if (value == null) return null;
    if (value instanceof Shadow) {
      return new Shadow({
        color: value.color,
        blur: value.blur,
        offsetX: value.offsetX,
        offsetY: value.offsetY,
        affectStroke: value.affectStroke,
        nonScaling: value.nonScaling,
      });
    }
    if (typeof value === "object") return new Shadow(value as unknown as ConstructorParameters<typeof Shadow>[0]);
  }
  if (key === "fill" && value != null && typeof value === "object") {
    return structuredClone(value);
  }
  return value;
}

function pickProps(obj: fabric.FabricObject, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = readProp(obj, k);
    if (v !== undefined) out[k] = cloneStoredValue(k, v);
  }
  return out;
}

export function copyStyleFrom(obj: fabric.FabricObject): boolean {
  const kind = styleKind(obj);
  if (kind === "unknown") return false;
  const target = resolveStyleTarget(obj);
  const props = pickProps(target, keysForKind(kind));
  if (obj.type === "group") {
    Object.assign(props, pickProps(obj, ["opacity", "angle", "flipX", "flipY", "shadow"]));
  }
  if (isImageType(target)) {
    const radius = readProp(target, "gpCornerRadius");
    if (radius !== undefined) props.gpCornerRadius = radius;
  }
  if (Object.keys(props).length === 0) return false;
  stored = { kind, props };
  return true;
}

export function hasStoredStyle(): boolean {
  return stored !== null && Object.keys(stored.props).length > 0;
}

/** @internal test helper */
export function clearStyleClipboard(): void {
  stored = null;
}

export function pasteStyleTo(obj: fabric.FabricObject): Record<string, unknown> | null {
  if (!stored) return null;
  const targetKind = styleKind(obj);
  if (targetKind === "unknown") return null;

  const keys =
    stored.kind === targetKind
      ? Object.keys(stored.props)
      : SHARED_KEYS.filter((k) => k in stored!.props);

  const patch: Record<string, unknown> = {};
  for (const k of keys) {
    if (stored.props[k] !== undefined) patch[k] = cloneStoredValue(k, stored.props[k]);
  }
  return Object.keys(patch).length ? patch : null;
}

export function applyStylePatch(obj: fabric.FabricObject, patch: Record<string, unknown>): void {
  const stylePatch = { ...patch };
  if ("gpCornerRadius" in stylePatch) {
    const raw = stylePatch.gpCornerRadius;
    const n = typeof raw === "number" ? raw : Number(raw);
    setProp(obj, "gpCornerRadius", Number.isFinite(n) ? Math.max(0, n) : 0);
    delete stylePatch.gpCornerRadius;
  }
  if (Object.keys(stylePatch).length) {
    obj.set(stylePatch);
    obj.setCoords();
  }
  if (obj.type === "group") {
    for (const child of (obj as fabric.Group).getObjects()) {
      applyStylePatch(child, patch);
    }
  }
}
