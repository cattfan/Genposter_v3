import type { Mapping } from "@genposter/schema";

import { readDir } from "./fsx.js";
import { imageExtensions, loadMapping } from "./mapping.js";
import { join, paths } from "./paths.js";
import { norm } from "./text.js";

interface GroupIndex {
  /** Image files directly in the group folder (absolute paths). */
  files: string[];
  /** Subfolder name -> image files inside it (absolute paths). */
  subdirs: Map<string, string[]>;
}

const indexCache = new Map<string, GroupIndex>();

function isImage(name: string, exts: string[]): boolean {
  const lower = name.toLowerCase();
  return exts.some((e) => lower.endsWith(e));
}

async function buildIndex(groupRelPath: string, m: Mapping): Promise<GroupIndex> {
  const exts = imageExtensions(m);
  const abs = paths.photosGroup(groupRelPath);
  const entries = await readDir(abs);
  const files: string[] = [];
  const subdirs = new Map<string, string[]>();

  for (const e of entries) {
    if (e.isFile && isImage(e.name, exts)) {
      files.push(join(abs, e.name));
    } else if (e.isDirectory) {
      const sub = await readDir(join(abs, e.name));
      const subImgs = sub
        .filter((s) => s.isFile && isImage(s.name, exts))
        .map((s) => join(abs, e.name, s.name));
      if (subImgs.length) subdirs.set(e.name, subImgs);
    }
  }
  files.sort();
  return { files, subdirs };
}

async function groupIndex(groupSlug: string): Promise<GroupIndex | null> {
  const m = await loadMapping();
  const group = m.photos[groupSlug];
  if (!group) return null;
  if (indexCache.has(groupSlug)) return indexCache.get(groupSlug)!;
  const idx = await buildIndex(group.path, m);
  indexCache.set(groupSlug, idx);
  return idx;
}

export function clearPhotoCache(): void {
  indexCache.clear();
}

export interface ResolveCtx {
  /** mapping photo group slug (e.g. "quan_an"). */
  groupSlug: string | null;
  /** The Link_drive / photo_key value from the row. */
  photoKey?: string;
  /** The item display name, used as a secondary match. */
  name?: string;
  /** Row ordinal in the filtered set (fallback distribution). */
  ordinal: number;
  /** How many photos to return. */
  count: number;
}

/**
 * Resolve photos for one item. Strategy:
 *  1. If the group has subfolders, match a subfolder by photo_key or name.
 *  2. Otherwise match flat files whose name contains photo_key or name.
 *  3. Fallback: take a stable slice based on the row ordinal.
 */
export async function resolvePhotos(ctx: ResolveCtx): Promise<string[]> {
  if (!ctx.groupSlug || ctx.count <= 0) return [];
  const idx = await groupIndex(ctx.groupSlug);
  if (!idx) return [];

  const keyN = norm(ctx.photoKey);
  const nameN = norm(ctx.name);

  if (idx.subdirs.size > 0) {
    let match: string[] | undefined;
    for (const [dirName, imgs] of idx.subdirs) {
      const dn = norm(dirName);
      if (keyN && (dn === keyN || dn.includes(keyN) || keyN.includes(dn))) {
        match = imgs;
        break;
      }
    }
    if (!match && nameN) {
      for (const [dirName, imgs] of idx.subdirs) {
        const dn = norm(dirName);
        if (dn === nameN || dn.includes(nameN) || nameN.includes(dn)) {
          match = imgs;
          break;
        }
      }
    }
    if (match) return match.slice(0, ctx.count);
  }

  if (idx.files.length) {
    if (keyN || nameN) {
      const hits = idx.files.filter((f) => {
        const base = norm(f.split("/").pop() ?? "");
        return (keyN && base.includes(keyN)) || (nameN && base.includes(nameN));
      });
      if (hits.length) return hits.slice(0, ctx.count);
    }
    // Fallback: deterministic slice so each row gets distinct photos.
    const start = (ctx.ordinal * ctx.count) % idx.files.length;
    const out: string[] = [];
    for (let i = 0; i < ctx.count; i++) {
      out.push(idx.files[(start + i) % idx.files.length]!);
    }
    return out;
  }

  return [];
}
