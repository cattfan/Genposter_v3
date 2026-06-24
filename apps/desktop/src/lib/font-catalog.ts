export type FontTier = "A" | "B" | "C";

export interface FontCatalogEntry {
  family: string;
  file: string;
  weight: string;
  style: "normal" | "italic";
  tier: FontTier;
  group: string;
}

const G = {
  sansBody: "Sans — nội dung (VN)",
  serif: "Serif (VN)",
  display: "Sans — tiêu đề & display (VN)",
  rounded: "Bo tròn / thân thiện (VN)",
  decor: "Trang trí & chữ tay (VN)",
} as const;

function pair(
  family: string,
  fileBase: string,
  tier: FontTier,
  group: string,
): FontCatalogEntry[] {
  return [
    { family, file: `${fileBase}-Regular.ttf`, weight: "400", style: "normal", tier, group },
    { family, file: `${fileBase}-Bold.ttf`, weight: "700", style: "normal", tier, group },
  ];
}

function single(
  family: string,
  file: string,
  weight: string,
  tier: FontTier,
  group: string,
  style: "normal" | "italic" = "normal",
): FontCatalogEntry {
  return { family, file, weight, style, tier, group };
}

const beVietnam: FontCatalogEntry[] = [
  single("Be Vietnam Pro", "BeVietnamPro-Regular.ttf", "400", "A", G.sansBody),
  single("Be Vietnam Pro", "BeVietnamPro-Italic.ttf", "400", "A", G.sansBody, "italic"),
  single("Be Vietnam Pro", "BeVietnamPro-Medium.ttf", "500", "A", G.sansBody),
  single("Be Vietnam Pro", "BeVietnamPro-SemiBold.ttf", "600", "A", G.sansBody),
  single("Be Vietnam Pro", "BeVietnamPro-Bold.ttf", "700", "A", G.sansBody),
];

export const FONT_CATALOG: FontCatalogEntry[] = [
  ...beVietnam,
  // Tier A sans body (17 thêm)
  ...pair("Inter", "Inter", "A", G.sansBody),
  ...pair("Noto Sans", "NotoSans", "A", G.sansBody),
  ...pair("Open Sans", "OpenSans", "A", G.sansBody),
  ...pair("Roboto", "Roboto", "A", G.sansBody),
  ...pair("Source Sans 3", "SourceSans3", "A", G.sansBody),
  ...pair("IBM Plex Sans", "IBMPlexSans", "A", G.sansBody),
  ...pair("Fira Sans", "FiraSans", "A", G.sansBody),
  ...pair("Barlow", "Barlow", "A", G.sansBody),
  ...pair("Manrope", "Manrope", "A", G.sansBody),
  ...pair("DM Sans", "DMSans", "A", G.sansBody),
  ...pair("Work Sans", "WorkSans", "A", G.sansBody),
  ...pair("Rubik", "Rubik", "A", G.sansBody),
  ...pair("Mulish", "Mulish", "A", G.sansBody),
  ...pair("Ubuntu", "Ubuntu", "A", G.sansBody),
  ...pair("Cabin", "Cabin", "A", G.sansBody),
  ...pair("Public Sans", "PublicSans", "A", G.sansBody),
  ...pair("Plus Jakarta Sans", "PlusJakartaSans", "A", G.sansBody),
  // Tier A serif (8)
  ...pair("Noto Serif", "NotoSerif", "A", G.serif),
  ...pair("Merriweather", "Merriweather", "A", G.serif),
  ...pair("Lora", "Lora", "A", G.serif),
  ...pair("Source Serif 4", "SourceSerif4", "A", G.serif),
  ...pair("IBM Plex Serif", "IBMPlexSerif", "A", G.serif),
  ...pair("PT Serif", "PTSerif", "A", G.serif),
  ...pair("Literata", "Literata", "A", G.serif),
  ...pair("Roboto Slab", "RobotoSlab", "A", G.serif),
  // Tier B display (10)
  ...pair("Lexend", "Lexend", "B", G.display),
  ...pair("Oswald", "Oswald", "B", G.display),
  ...pair("Barlow Condensed", "BarlowCondensed", "B", G.display),
  single("Anton", "Anton-Regular.ttf", "400", "B", G.display),
  ...pair("Exo 2", "Exo2", "B", G.display),
  ...pair("Josefin Sans", "JosefinSans", "B", G.display),
  ...pair("Raleway", "Raleway", "B", G.display),
  ...pair("Signika", "Signika", "B", G.display),
  ...pair("Archivo", "Archivo", "B", G.display),
  single("Montserrat", "Montserrat-Bold.ttf", "700", "B", G.display),
  single("Montserrat", "Montserrat-ExtraBold.ttf", "800", "B", G.display),
  // Tier B rounded (6)
  ...pair("Nunito", "Nunito", "B", G.rounded),
  ...pair("Quicksand", "Quicksand", "B", G.rounded),
  ...pair("Comfortaa", "Comfortaa", "B", G.rounded),
  ...pair("M PLUS Rounded 1c", "MPLUSRounded1c", "B", G.rounded),
  ...pair("Baloo 2", "Baloo2", "B", G.rounded),
  single("Varela Round", "VarelaRound-Regular.ttf", "400", "B", G.rounded),
  // Tier C decor (6)
  ...pair("Caveat", "Caveat", "C", G.decor),
  single("Satisfy", "Satisfy-Regular.ttf", "400", "C", G.decor),
  single("Allison", "Allison-Regular.ttf", "400", "C", G.decor),
  ...pair("Shantell Sans", "ShantellSans", "C", G.decor),
  single("Patrick Hand", "PatrickHand-Regular.ttf", "400", "C", G.decor),
  single("Dancing Script", "DancingScript-Regular.ttf", "400", "C", G.decor),
];

export function uniqueFamilies(): string[] {
  return [...new Set(FONT_CATALOG.map((e) => e.family))];
}

export function fontFamilyGroups(): { group: string; families: string[] }[] {
  const map = new Map<string, string[]>();
  for (const e of FONT_CATALOG) {
    let families = map.get(e.group);
    if (!families) {
      families = [];
      map.set(e.group, families);
    }
    if (!families.includes(e.family)) {
      families.push(e.family);
    }
  }
  return [...map.entries()].map(([group, families]) => ({ group, families }));
}

export function tierForFamily(family: string): FontTier | undefined {
  return FONT_CATALOG.find((e) => e.family === family)?.tier;
}
