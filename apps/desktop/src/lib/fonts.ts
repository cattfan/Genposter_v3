import { FONT_CATALOG, tierForFamily, type FontTier } from "./font-catalog.js";
import { assetUrl, exists } from "./fsx.js";
import { join, paths } from "./paths.js";

const AVAILABLE = new Set<string>();
let loaded = false;

export interface FontFamilyOption {
  value: string;
  label: string;
  group: string;
  tier: FontTier;
}

/** Register brand fonts (from data/brand/fonts) so canvas + render use them. */
export async function ensureFonts(): Promise<void> {
  if (loaded) return;
  const dir = paths.brandFonts();
  for (const f of FONT_CATALOG) {
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

/** Font families that actually loaded, grouped and sorted for UI. */
export function availableFamilies(): FontFamilyOption[] {
  const seen = new Set<string>();
  const out: FontFamilyOption[] = [];
  for (const e of FONT_CATALOG) {
    if (!AVAILABLE.has(e.family) || seen.has(e.family)) continue;
    seen.add(e.family);
    out.push({
      value: e.family,
      label: e.family,
      group: e.group,
      tier: tierForFamily(e.family) ?? "A",
    });
  }
  return out.sort(
    (a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label),
  );
}

export function getFontPreviewStyle(family: string): Record<string, string> {
  return { fontFamily: `"${family}", sans-serif` };
}

export function isAvailable(family: string): boolean {
  return AVAILABLE.has(family);
}
