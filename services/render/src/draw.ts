import { type Image, type SKRSContext2D, loadImage } from "@napi-rs/canvas";

import { bindText } from "./bind.js";
import { resolveFontAlias } from "./fonts.js";

export function roundRectPath(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export interface RectOpts {
  fill?: string;
  radius?: number;
  stroke?: string;
  strokeWidth?: number;
}

export function drawRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: RectOpts = {},
): void {
  roundRectPath(ctx, x, y, w, h, opts.radius ?? 0);
  if (opts.fill) {
    ctx.fillStyle = opts.fill;
    ctx.fill();
  }
  if (opts.stroke) {
    ctx.strokeStyle = opts.stroke;
    ctx.lineWidth = opts.strokeWidth ?? 1;
    ctx.stroke();
  }
}

function wrap(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of String(text).split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth || !line) {
        line = test;
      } else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

export interface TextOpts {
  text: string;
  x: number;
  y: number;
  width: number;
  height?: number;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: number | string;
  fill?: string;
  align?: "left" | "center" | "right";
  lineHeight?: number;
  autoFit?: boolean;
  uppercase?: boolean;
}

/** Draws wrapped, optionally auto-fitted text. Returns the y after the text. */
export function drawText(ctx: SKRSContext2D, o: TextOpts): number {
  const alias = resolveFontAlias(o.fontFamily, o.fontWeight);
  const lh = o.lineHeight ?? 1.2;
  const minSize = 12;
  let size = o.fontSize;
  let content = o.text ?? "";
  if (o.uppercase) content = content.toUpperCase();

  let lines: string[] = [];
  for (;;) {
    ctx.font = `${size}px "${alias}"`;
    lines = wrap(ctx, content, o.width);
    const totalH = lines.length * size * lh;
    const widthOk = lines.every((l) => ctx.measureText(l).width <= o.width + 0.5);
    const heightOk = !o.height || totalH <= o.height;
    if (!o.autoFit || (widthOk && heightOk) || size <= minSize) break;
    size -= 1;
  }

  ctx.fillStyle = o.fill ?? "#000000";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  let yy = o.y;
  for (const line of lines) {
    const lw = ctx.measureText(line).width;
    let lx = o.x;
    if (o.align === "center") lx = o.x + (o.width - lw) / 2;
    else if (o.align === "right") lx = o.x + (o.width - lw);
    ctx.fillText(line, lx, yy);
    yy += size * lh;
  }
  return yy;
}

export async function loadImageSafe(path: string): Promise<Image | null> {
  try {
    return await loadImage(path);
  } catch {
    return null;
  }
}

export function drawPlaceholder(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 0,
): void {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.clip();
  ctx.fillStyle = "#f0ece8";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#ddd5cd";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y + h);
  ctx.moveTo(x + w, y);
  ctx.lineTo(x, y + h);
  ctx.stroke();
  ctx.restore();
}

export function drawImageBox(
  ctx: SKRSContext2D,
  img: Image,
  x: number,
  y: number,
  w: number,
  h: number,
  fit: "cover" | "contain" = "cover",
  radius = 0,
): void {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.clip();
  const iw = img.width;
  const ih = img.height;
  const ir = iw / ih;
  const r = w / h;
  if (fit === "contain") {
    let dw: number;
    let dh: number;
    if (ir > r) {
      dw = w;
      dh = w / ir;
    } else {
      dh = h;
      dw = h * ir;
    }
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  } else {
    let sw: number;
    let sh: number;
    let sx: number;
    let sy: number;
    if (ir > r) {
      sh = ih;
      sw = ih * r;
      sx = (iw - sw) / 2;
      sy = 0;
    } else {
      sw = iw;
      sh = iw / r;
      sx = 0;
      sy = (ih - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }
  ctx.restore();
}

export { bindText };
