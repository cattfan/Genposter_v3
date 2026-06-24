import { assetUrl, exists } from "./fsx.js";
import { join, paths } from "./paths.js";

interface FontDef {
  family: string;
  file: string;
  weight: string;
  style: "normal" | "italic";
}

const FONTS: FontDef[] = [
  { family: "Be Vietnam Pro", file: "BeVietnamPro-Regular.ttf", weight: "400", style: "normal" },
  { family: "Be Vietnam Pro", file: "BeVietnamPro-Italic.ttf", weight: "400", style: "italic" },
  { family: "Be Vietnam Pro", file: "BeVietnamPro-Medium.ttf", weight: "500", style: "normal" },
  { family: "Be Vietnam Pro", file: "BeVietnamPro-SemiBold.ttf", weight: "600", style: "normal" },
  { family: "Be Vietnam Pro", file: "BeVietnamPro-Bold.ttf", weight: "700", style: "normal" },
  { family: "Montserrat", file: "Montserrat-Bold.ttf", weight: "700", style: "normal" },
  { family: "Montserrat", file: "Montserrat-ExtraBold.ttf", weight: "800", style: "normal" },
];

const AVAILABLE = new Set<string>();
let loaded = false;

/** Register brand fonts (from data/brand/fonts) so canvas + render use them. */
export async function ensureFonts(): Promise<void> {
  if (loaded) return;
  const dir = paths.brandFonts();
  for (const f of FONTS) {
    const p = join(dir, f.file);
    if (!(await exists(p))) continue;
    try {
      const face = new FontFace(f.family, `url("${assetUrl(p)}")`, {
        weight: f.weight,
        style: f.style,
      });
      await face.load();
      document.fonts.add(face);
      AVAILABLE.add(f.family);
    } catch {
      // ignore individual font load failures
    }
  }
  try {
    await document.fonts.ready;
  } catch {
    // ignore
  }
  loaded = true;
}

/** Font families that actually loaded (plus safe web fallbacks). */
export function availableFamilies(): string[] {
  const base = ["Be Vietnam Pro", "Montserrat"];
  const extra = ["Arial", "Georgia", "Times New Roman", "Roboto"];
  return [...base, ...extra];
}

export function isAvailable(family: string): boolean {
  return AVAILABLE.has(family);
}
