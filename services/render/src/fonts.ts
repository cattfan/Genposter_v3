import { existsSync } from "node:fs";
import { join } from "node:path";

import { GlobalFonts } from "@napi-rs/canvas";

import { FONT_DIR } from "./paths.js";

let registered = false;

/** Register brand fonts once. Safe to call repeatedly. */
export function ensureFonts(): void {
  if (registered) return;
  const reg = (file: string, alias: string) => {
    const p = join(FONT_DIR, file);
    if (existsSync(p)) GlobalFonts.registerFromPath(p, alias);
  };
  reg("BeVietnamPro-Regular.ttf", "Be Vietnam Pro");
  reg("BeVietnamPro-SemiBold.ttf", "Be Vietnam Pro SemiBold");
  reg("BeVietnamPro-Bold.ttf", "Be Vietnam Pro Bold");
  reg("Montserrat-Bold.ttf", "Montserrat");
  reg("Montserrat-ExtraBold.ttf", "Montserrat ExtraBold");
  registered = true;
}

function toWeight(weight: number | string | undefined): number {
  if (typeof weight === "number") return weight;
  if (weight === "bold") return 700;
  const n = weight ? parseInt(weight, 10) : NaN;
  return Number.isFinite(n) ? n : 400;
}

/**
 * Map a requested (family, weight) to a concrete registered alias so we never
 * rely on synthetic bolding (which is inconsistent across platforms).
 */
export function resolveFontAlias(family = "Be Vietnam Pro", weight?: number | string): string {
  const w = toWeight(weight);
  if (/montserrat/i.test(family)) {
    return w >= 800 ? "Montserrat ExtraBold" : "Montserrat";
  }
  if (w >= 700) return "Be Vietnam Pro Bold";
  if (w >= 600) return "Be Vietnam Pro SemiBold";
  return "Be Vietnam Pro";
}
