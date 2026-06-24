#!/usr/bin/env node
/**
 * Downloads .ttf files listed in font-catalog.ts into data/brand/fonts/.
 * Uses google-webfonts-helper API (Vietnamese subset) for static TTF URLs.
 *
 * Run from repo root: pnpm fetch:fonts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "apps", "desktop", "src", "lib", "font-catalog.ts");
const outDir = path.join(root, "data", "brand", "fonts");

/** @typedef {{ family: string, file: string, weight: string, style: "normal" | "italic" }} CatalogEntry */

/** @param {string} src @returns {CatalogEntry[]} */
function parseCatalog(src) {
  /** @type {CatalogEntry[]} */
  const entries = [];

  const singleRe =
    /single\(\s*"([^"]+)"\s*,\s*"([^"]+\.ttf)"\s*,\s*"(\d+)"\s*,\s*"[ABC]"\s*,\s*G\.\w+(?:\s*,\s*"(normal|italic)")?\s*\)/g;
  let m;
  while ((m = singleRe.exec(src))) {
    entries.push({
      family: m[1],
      file: m[2],
      weight: m[3],
      style: /** @type {"normal" | "italic"} */ (m[4] || "normal"),
    });
  }

  const pairRe = /pair\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"[ABC]"\s*,\s*G\.\w+\s*\)/g;
  while ((m = pairRe.exec(src))) {
    entries.push({
      family: m[1],
      file: `${m[2]}-Regular.ttf`,
      weight: "400",
      style: "normal",
    });
    entries.push({
      family: m[1],
      file: `${m[2]}-Bold.ttf`,
      weight: "700",
      style: "normal",
    });
  }

  return entries;
}

/** @param {string} family */
function familyToGwfhId(family) {
  return family.toLowerCase().replace(/\s+/g, "-");
}

/** @type {Map<string, Promise<{ variants: Array<{ fontWeight: string, fontStyle: string, ttf?: string }> } | null>>} */
const familyCache = new Map();

/** @param {string} family */
async function loadFamily(family) {
  const id = familyToGwfhId(family);
  let pending = familyCache.get(id);
  if (!pending) {
    pending = (async () => {
      const apiUrl = `https://gwfh.mranftl.com/api/fonts/${encodeURIComponent(id)}?subsets=vietnamese`;
      const res = await fetch(apiUrl);
      if (!res.ok) {
        console.error(`error  API ${family} (${id}): HTTP ${res.status}`);
        return null;
      }
      return /** @type {{ variants: Array<{ fontWeight: string, fontStyle: string, ttf?: string }> }} */ (
        await res.json()
      );
    })();
    familyCache.set(id, pending);
  }
  return pending;
}

/**
 * @param {CatalogEntry} entry
 * @returns {Promise<string | null>}
 */
async function resolveTtfUrl(entry) {
  const data = await loadFamily(entry.family);
  if (!data?.variants?.length) return null;

  const variant = data.variants.find(
    (v) => v.fontWeight === entry.weight && v.fontStyle === entry.style && v.ttf,
  );
  return variant?.ttf ?? null;
}

/** @param {string} url @param {string} dest */
async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
}

async function main() {
  const catalogSrc = fs.readFileSync(catalogPath, "utf8");
  const entries = parseCatalog(catalogSrc);

  if (entries.length === 0) {
    console.error("error  No font entries parsed from font-catalog.ts");
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  let ok = 0;
  let skip = 0;
  let err = 0;

  console.log(`catalog ${entries.length} files from font-catalog.ts`);

  for (const entry of entries) {
    const dest = path.join(outDir, entry.file);
    if (fs.existsSync(dest)) {
      console.log("skip", entry.file);
      skip++;
      continue;
    }

    try {
      const url = await resolveTtfUrl(entry);
      if (!url) {
        console.error(
          `error  ${entry.file}: no TTF for ${entry.family} wght ${entry.weight} ${entry.style}`,
        );
        err++;
        continue;
      }
      await downloadFile(url, dest);
      console.log("ok   ", entry.file);
      ok++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`error  ${entry.file}: ${msg}`);
      err++;
    }
  }

  console.log(`done  ok=${ok} skip=${skip} error=${err}`);
  if (err > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
