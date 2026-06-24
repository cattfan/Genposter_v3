import type { GenposterTemplate } from "@genposter/schema";

import { ensureDir, exists, readDir, readText, writeText } from "./fsx.js";
import { join, paths, slugify } from "./paths.js";

export interface TemplateSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  updatedAt?: string;
}

export async function listTemplates(): Promise<TemplateSummary[]> {
  const dir = paths.templatesDir();
  if (!(await exists(dir))) return [];
  const entries = await readDir(dir);
  const out: TemplateSummary[] = [];
  for (const e of entries) {
    if (!e.isFile || !e.name.endsWith(".json")) continue;
    try {
      const t = JSON.parse(await readText(join(dir, e.name))) as GenposterTemplate;
      out.push({
        id: t.id ?? e.name.replace(/\.json$/, ""),
        name: t.name ?? e.name.replace(/\.json$/, ""),
        width: t.width,
        height: t.height,
        updatedAt: t.updatedAt,
      });
    } catch {
      // skip invalid file
    }
  }
  out.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  return out;
}

export async function loadTemplate(id: string): Promise<GenposterTemplate> {
  const text = await readText(paths.template(id));
  return JSON.parse(text) as GenposterTemplate;
}

export async function saveTemplate(tpl: GenposterTemplate): Promise<string> {
  const id = slugify(tpl.id || tpl.name);
  const toSave: GenposterTemplate = { ...tpl, id, updatedAt: new Date().toISOString() };
  await ensureDir(paths.templatesDir());
  await writeText(paths.template(id), JSON.stringify(toSave, null, 2));
  return id;
}
