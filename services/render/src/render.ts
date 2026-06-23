import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { type Canvas, createCanvas, type SKRSContext2D } from "@napi-rs/canvas";

import type {
  GalleryLayer,
  GenposterTemplate,
  ImageLayer,
  Layer,
  ListLayer,
  RectLayer,
  Slide,
  TextLayer,
} from "@genposter/template-schema";

import { bindText } from "./bind.js";
import {
  drawImageBox,
  drawPlaceholder,
  drawRect,
  drawText,
  loadImageSafe,
} from "./draw.js";
import { ensureFonts } from "./fonts.js";
import { OUTPUT_DIR, TEMPLATES_DIR, resolveRepo } from "./paths.js";

type Ctx = Record<string, unknown>;

function mkCtx(slide: Slide, extra: Record<string, unknown> = {}): Ctx {
  return { ...slide, slide, ...extra };
}

function pickPhoto(bind: string, ctx: Ctx): string | undefined {
  const [scope, nStr] = String(bind).split(":");
  const idx = nStr ? parseInt(nStr, 10) || 0 : 0;
  const arr =
    scope === "item"
      ? ((ctx.item as { photos?: string[] } | undefined)?.photos ?? [])
      : ((ctx.slide as Slide | undefined)?.photos ?? []);
  return arr[idx];
}

function imageSrc(layer: ImageLayer, ctx: Ctx): string | null {
  if (layer.bind) {
    const p = pickPhoto(layer.bind, ctx);
    return p ? resolveRepo(p) : null;
  }
  if (layer.src && layer.src.includes("{{")) {
    const p = bindText(layer.src, ctx);
    return p ? resolveRepo(p) : null;
  }
  if (layer.src) return resolveRepo(layer.src);
  return null;
}

function drawTextLayer(ctx: SKRSContext2D, layer: TextLayer, bindCtx: Ctx, x: number, y: number): void {
  drawText(ctx, {
    text: bindText(layer.text, bindCtx),
    x,
    y,
    width: layer.width,
    height: layer.height,
    fontSize: layer.fontSize,
    fontFamily: layer.fontFamily,
    fontWeight: layer.fontWeight,
    fill: layer.fill,
    align: layer.align,
    lineHeight: layer.lineHeight,
    autoFit: layer.autoFit,
    uppercase: layer.uppercase,
  });
}

async function drawImageLayer(
  ctx: SKRSContext2D,
  layer: ImageLayer,
  bindCtx: Ctx,
  x: number,
  y: number,
): Promise<void> {
  const src = imageSrc(layer, bindCtx);
  const img = src ? await loadImageSafe(src) : null;
  if (img) {
    drawImageBox(ctx, img, x, y, layer.width, layer.height, layer.fit ?? "cover", layer.radius ?? 0);
  } else {
    drawPlaceholder(ctx, x, y, layer.width, layer.height, layer.radius ?? 0);
  }
}

function drawRectLayer(ctx: SKRSContext2D, layer: RectLayer, x: number, y: number): void {
  drawRect(ctx, x, y, layer.width, layer.height ?? 0, {
    fill: layer.fill,
    radius: layer.radius,
    stroke: layer.stroke,
    strokeWidth: layer.strokeWidth,
  });
}

async function drawCell(
  ctx: SKRSContext2D,
  cell: TextLayer | ImageLayer | RectLayer,
  absX: number,
  absY: number,
  bindCtx: Ctx,
): Promise<void> {
  if (cell.type === "text") drawTextLayer(ctx, cell, bindCtx, absX, absY);
  else if (cell.type === "image") await drawImageLayer(ctx, cell, bindCtx, absX, absY);
  else if (cell.type === "rect") drawRectLayer(ctx, cell, absX, absY);
}

async function drawList(ctx: SKRSContext2D, layer: ListLayer, slide: Slide): Promise<void> {
  const max = layer.maxRows ?? slide.items.length;
  const rows = slide.items.slice(0, max);
  const gap = layer.gap ?? 0;
  for (let i = 0; i < rows.length; i++) {
    const rowY = layer.y + i * (layer.rowHeight + gap);
    const bindCtx = mkCtx(slide, { item: rows[i], n: i + 1, index: i });
    for (const cell of layer.cells) {
      await drawCell(ctx, cell, layer.x + cell.x, rowY + cell.y, bindCtx);
    }
    if (layer.divider) {
      ctx.strokeStyle = layer.divider.color;
      ctx.lineWidth = layer.divider.width ?? 1;
      const dy = rowY + layer.rowHeight;
      ctx.beginPath();
      ctx.moveTo(layer.x, dy);
      ctx.lineTo(layer.x + layer.width, dy);
      ctx.stroke();
    }
  }
}

async function drawGallery(ctx: SKRSContext2D, layer: GalleryLayer, slide: Slide): Promise<void> {
  const photos = slide.photos ?? [];
  const cols = Math.max(1, layer.columns);
  const rowsCount = layer.rows ?? Math.max(1, Math.ceil(photos.length / cols));
  const gap = layer.gap ?? 0;
  const cellW = (layer.width - (cols - 1) * gap) / cols;
  const cellH = layer.height
    ? (layer.height - (rowsCount - 1) * gap) / rowsCount
    : cellW;
  const slots = cols * rowsCount;
  for (let i = 0; i < slots; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = layer.x + c * (cellW + gap);
    const y = layer.y + r * (cellH + gap);
    const path = photos[i];
    const img = path ? await loadImageSafe(resolveRepo(path)) : null;
    if (img) drawImageBox(ctx, img, x, y, cellW, cellH, layer.fit ?? "cover", layer.radius ?? 0);
    else drawPlaceholder(ctx, x, y, cellW, cellH, layer.radius ?? 0);
  }
}

async function drawLayer(ctx: SKRSContext2D, layer: Layer, slide: Slide): Promise<void> {
  const top = mkCtx(slide);
  switch (layer.type) {
    case "rect":
      drawRectLayer(ctx, layer, layer.x, layer.y);
      break;
    case "text":
      drawTextLayer(ctx, layer, top, layer.x, layer.y);
      break;
    case "image":
      await drawImageLayer(ctx, layer, top, layer.x, layer.y);
      break;
    case "list":
      await drawList(ctx, layer, slide);
      break;
    case "gallery":
      await drawGallery(ctx, layer, slide);
      break;
  }
}

export async function renderSlide(template: GenposterTemplate, slide: Slide): Promise<Canvas> {
  ensureFonts();
  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = template.background ?? "#ffffff";
  ctx.fillRect(0, 0, template.width, template.height);
  for (const layer of template.layers) {
    await drawLayer(ctx, layer, slide);
  }
  return canvas;
}

export function loadTemplate(templateId: string, templatePath?: string): GenposterTemplate {
  const file = templatePath
    ? resolveRepo(templatePath)
    : join(TEMPLATES_DIR, `${templateId}.json`);
  return JSON.parse(readFileSync(file, "utf-8")) as GenposterTemplate;
}

function applyTokens(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)(?::(\d+)d)?\}/g, (_m, key: string, pad?: string) => {
    const v = vars[key];
    if (v == null) return "";
    if (pad) return String(v).padStart(parseInt(pad, 10), "0");
    return String(v);
  });
}

export interface RenderJobInput {
  recipe?: string;
  templateId: string;
  output?: {
    dir?: string;
    format?: "jpg" | "png";
    quality?: number;
    naming?: string;
  };
  slides: Slide[];
}

export interface RenderOptions {
  templatePath?: string;
  outDir?: string;
  onProgress?: (done: number, total: number, file: string) => void;
}

export async function renderJob(job: RenderJobInput, opts: RenderOptions = {}): Promise<string[]> {
  const template = loadTemplate(job.templateId, opts.templatePath);
  const date = new Date().toISOString().slice(0, 10);
  const dirRaw = opts.outDir ?? job.output?.dir ?? OUTPUT_DIR;
  const outDir = resolveRepo(applyTokens(dirRaw, { date }));
  mkdirSync(outDir, { recursive: true });

  const fmt = job.output?.format ?? "jpg";
  const quality = job.output?.quality ?? 90;
  const naming = job.output?.naming ?? "{id}_{index:02d}.{ext}";
  const ext = fmt === "png" ? "png" : "jpg";

  const files: string[] = [];
  for (const slide of job.slides) {
    const canvas = await renderSlide(template, slide);
    const buf =
      fmt === "png" ? await canvas.encode("png") : await canvas.encode("jpeg", quality);
    const name = applyTokens(naming, {
      id: template.id,
      index: slide.index,
      date,
      recipe: job.recipe ?? template.id,
      ext,
    });
    const fp = join(outDir, name);
    writeFileSync(fp, buf);
    files.push(fp);
    opts.onProgress?.(files.length, job.slides.length, fp);
  }
  return files;
}
