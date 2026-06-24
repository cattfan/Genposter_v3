import { settings } from "./settings.js";

/** Join path segments with forward slashes (Tauri fs accepts these on Windows). */
export function join(...parts: string[]): string {
  return parts
    .map((p, i) => (i === 0 ? p.replace(/\/+$/, "") : p.replace(/^\/+|\/+$/g, "")))
    .filter(Boolean)
    .join("/");
}

export function root(): string {
  return settings().rootDir.replace(/\\/g, "/").replace(/\/+$/, "");
}

export const paths = {
  root,
  data: () => join(root(), "data"),
  mapping: () => join(root(), "data", "mapping.yaml"),
  database: (rel: string) => join(root(), "data", rel),
  photosGroup: (relPath: string) => join(root(), "data", relPath),
  brandFonts: () => join(root(), "data", "brand", "fonts"),
  templatesDir: () => join(root(), "templates"),
  template: (id: string) => join(root(), "templates", `${id}.json`),
  recipesDir: () => join(root(), "recipes"),
  recipe: (id: string) => join(root(), "recipes", `${id}.yaml`),
  outputDir: () => join(root(), "output"),
  outputSub: (rel: string) => join(root(), rel),
};

/** Slugify a free-form name into a safe file id. */
export function slugify(name: string): string {
  const base = name
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || `item_${Date.now()}`;
}
