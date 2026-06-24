import type { TemplateSet } from "@genposter/schema";

import {
  ensureDir,
  exists,
  readDir,
  readText,
  remove,
  writeText,
} from "./fsx.js";
import { join, paths, slugify } from "./paths.js";
import { emptyPage, normalizeSet } from "./templateset-util.js";

export interface TemplateSetSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  updatedAt?: string;
  pages: { id: string; name?: string; thumbnail?: string }[];
}

function fileId(name: string): string {
  return name.replace(/\.json$/i, "");
}

async function existingIds(): Promise<Set<string>> {
  const dir = paths.templatesDir();
  if (!(await exists(dir))) return new Set();
  const entries = await readDir(dir);
  return new Set(
    entries
      .filter((e) => e.isFile && e.name.endsWith(".json"))
      .map((e) => fileId(e.name)),
  );
}

async function uniqueId(base: string): Promise<string> {
  const ids = await existingIds();
  const root = slugify(base);
  let id = root;
  let n = 2;
  while (ids.has(id)) id = `${root}-${n++}`;
  return id;
}

async function writeSet(set: TemplateSet): Promise<void> {
  await ensureDir(paths.templatesDir());
  await writeText(paths.template(set.id), JSON.stringify(set, null, 2));
}

export async function listTemplateSets(): Promise<TemplateSetSummary[]> {
  const dir = paths.templatesDir();
  if (!(await exists(dir))) return [];
  const entries = await readDir(dir);
  const out: TemplateSetSummary[] = [];
  for (const e of entries) {
    if (!e.isFile || !e.name.endsWith(".json")) continue;
    try {
      const id = fileId(e.name);
      const raw = JSON.parse(await readText(join(dir, e.name)));
      const set = normalizeSet(raw, id);
      out.push({
        id,
        name: set.name,
        width: set.width,
        height: set.height,
        updatedAt: set.updatedAt,
        pages: set.pages.map((p) => ({
          id: p.id,
          name: p.name,
          thumbnail: p.thumbnail,
        })),
      });
    } catch {
      // skip invalid file
    }
  }
  out.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  return out;
}

export async function loadTemplateSet(id: string): Promise<TemplateSet> {
  const raw = JSON.parse(await readText(paths.template(id)));
  const set = normalizeSet(raw, id);
  set.id = id;
  return set;
}

export async function saveTemplateSet(set: TemplateSet): Promise<string> {
  const id = set.id || slugify(set.name);
  const updatedAt = new Date().toISOString();
  const toSave: TemplateSet = { ...set, id, updatedAt };
  await writeSet(toSave);
  set.id = id;
  set.updatedAt = updatedAt;
  return id;
}

export async function createTemplateSet(
  name: string,
  width: number,
  height: number,
): Promise<TemplateSet> {
  const id = await uniqueId(name);
  const now = new Date().toISOString();
  const set: TemplateSet = {
    id,
    name,
    width,
    height,
    pages: [emptyPage()],
    createdAt: now,
    updatedAt: now,
  };
  await writeSet(set);
  return set;
}

export async function duplicateTemplateSet(id: string): Promise<string> {
  const set = await loadTemplateSet(id);
  const newId = await uniqueId(`${set.name}-copy`);
  const now = new Date().toISOString();
  const copy: TemplateSet = {
    ...set,
    id: newId,
    name: `${set.name} (copy)`,
    pages: JSON.parse(JSON.stringify(set.pages)) as TemplateSet["pages"],
    createdAt: now,
    updatedAt: now,
  };
  await writeSet(copy);
  return newId;
}

export async function renameTemplateSet(id: string, name: string): Promise<void> {
  const set = await loadTemplateSet(id);
  set.name = name;
  await saveTemplateSet(set);
}

export async function deleteTemplateSet(id: string): Promise<void> {
  await remove(paths.template(id));
}
