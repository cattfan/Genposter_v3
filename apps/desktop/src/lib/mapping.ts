import yaml from "js-yaml";
import type { Mapping } from "@genposter/schema";

import { readText } from "./fsx.js";
import { paths } from "./paths.js";

let cache: Mapping | null = null;

export async function loadMapping(force = false): Promise<Mapping> {
  if (cache && !force) return cache;
  const text = await readText(paths.mapping());
  const parsed = yaml.load(text) as Mapping;
  if (!parsed || !parsed.sheets) {
    throw new Error("data/mapping.yaml không hợp lệ (thiếu 'sheets').");
  }
  cache = parsed;
  return cache;
}

export function clearMappingCache(): void {
  cache = null;
}

export function imageExtensions(m: Mapping): string[] {
  return (m.image_extensions ?? [".jpg", ".jpeg", ".png", ".webp"]).map((e) =>
    e.toLowerCase(),
  );
}
