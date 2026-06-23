/**
 * Genposter brand tokens. Derived from the Riviu logo (pure orange #ff6600).
 * Single source of truth for both the desktop UI and rendered templates.
 */
export const colors = {
  orange: "#ff6600",
  orangeDark: "#e65a00",
  orangeLight: "#ff8a3d",
  orange50: "#fff3eb",
  orange100: "#ffe0cc",
  ink: "#1f1d1b",
  muted: "#6b6660",
  surface: "#ffffff",
  bg: "#faf8f6",
  border: "#ece7e2",
  success: "#2e9e5b",
  danger: "#e5484d",
} as const;

export const fonts = {
  // Be Vietnam Pro first: full Vietnamese diacritic coverage (incl. uppercase
  // glyphs like "Ố" that Montserrat's static build is missing).
  heading: "'Be Vietnam Pro', 'Montserrat', system-ui, -apple-system, sans-serif",
  body: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
  /** Latin-only display font (numbers / non-Vietnamese accents). */
  display: "'Montserrat', sans-serif",
  /** Latin-only brush accent (no Vietnamese diacritics) - use sparingly. */
  script: "'Pacifico', cursive",
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

/** 4px spacing scale. */
export const space = (n: number): number => n * 4;

export const tokens = { colors, fonts, radius, space } as const;

export type Colors = typeof colors;
export type ColorToken = keyof Colors;
