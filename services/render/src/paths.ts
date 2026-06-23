import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// src -> render -> services -> repo root
export const REPO_ROOT = join(here, "..", "..", "..");
export const DATA_DIR = join(REPO_ROOT, "data");
export const FONT_DIR = join(DATA_DIR, "brand", "fonts");
export const TEMPLATES_DIR = join(REPO_ROOT, "templates");
export const OUTPUT_DIR = join(REPO_ROOT, "output");

/** Resolve a path that may be absolute or relative to the repo root. */
export function resolveRepo(p: string): string {
  return p.match(/^([a-zA-Z]:[\\/]|[\\/])/) ? p : join(REPO_ROOT, p);
}
