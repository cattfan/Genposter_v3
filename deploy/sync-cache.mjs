/**
 * Sync NocoDB → data/cache/<province>/ (text + attachment photos).
 * Mirrors apps/desktop sync for offline CLI use after import.
 *
 * Env: NC_URL, NC_BASE_ID, NC_TOKEN (xc-token), NC_PROVINCE (default dalat)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(path.join(ROOT, "apps/desktop/package.json"));
const yaml = req("js-yaml");

const NC = (process.env.NC_URL ?? "http://localhost:8080").replace(/\/$/, "");
const BASE_ID = process.env.NC_BASE_ID ?? "";
const TOKEN = process.env.NC_TOKEN ?? "";
const PROVINCE = process.env.NC_PROVINCE ?? "dalat";
if (!BASE_ID || !TOKEN) throw new Error("NC_BASE_ID and NC_TOKEN required");

const H = { "xc-token": TOKEN };

function attList(v) {
  if (!v) return [];
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return [];
    }
  }
  return Array.isArray(v) ? v : [];
}

function attSig(atts) {
  return atts.map((a) => `${a.path ?? a.url ?? a.title}:${a.size ?? 0}`).join("|");
}

function extOf(att) {
  const src = att.title ?? att.path ?? "";
  const m = /\.([a-z0-9]+)$/i.exec(src);
  return m ? m[1].toLowerCase() : "jpg";
}

async function apiJson(urlPath) {
  const r = await fetch(`${NC}${urlPath}`, { headers: H });
  if (!r.ok) throw new Error(`${urlPath} -> ${r.status}`);
  return r.json();
}

async function listAllRecords(tableId) {
  const out = [];
  let offset = 0;
  for (;;) {
    const j = await apiJson(`/api/v2/tables/${tableId}/records?limit=200&offset=${offset}`);
    out.push(...(j.list ?? []));
    if (j.pageInfo?.isLastPage || !(j.list ?? []).length) break;
    offset += 200;
  }
  return out;
}

async function downloadAtt(att, destAbs) {
  const signed = att.signedUrl ?? att.url;
  const p = att.signedPath ?? att.path;
  let url;
  if (signed?.startsWith("http")) url = signed;
  else if (p) url = `${NC}/${String(p).replace(/^\//, "")}`;
  else throw new Error("no attachment url");
  const r = await fetch(url, { headers: H });
  if (!r.ok) throw new Error(`download ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  fs.writeFileSync(destAbs, buf);
}

async function main() {
  const mapping = yaml.load(fs.readFileSync(path.join(ROOT, "data/mapping.yaml"), "utf8"));
  const tablesRes = await apiJson(`/api/v2/meta/bases/${BASE_ID}/tables`);
  const tableByTitle = new Map((tablesRes.list ?? []).map((t) => [t.title, t.id]));

  const cacheDir = path.join(ROOT, "data/cache", PROVINCE);
  const oldPath = path.join(cacheDir, "index.json");
  let old = null;
  try {
    old = JSON.parse(fs.readFileSync(oldPath, "utf8"));
  } catch {
    /* none */
  }
  const oldBySheet = new Map();
  for (const [name, sh] of Object.entries(old?.sheets ?? {})) {
    oldBySheet.set(name, new Map((sh.rows ?? []).map((r) => [r.id, r])));
  }

  const index = {
    province: PROVINCE,
    syncedAt: new Date().toISOString(),
    sheets: {},
  };
  const fpParts = [];
  let photosDownloaded = 0;
  let photosKept = 0;
  let rows = 0;

  for (const sheet of Object.keys(mapping.sheets)) {
    const tableId = tableByTitle.get(sheet);
    if (!tableId) {
      console.log(`SKIP ${sheet}: no table`);
      if (old?.sheets?.[sheet]) index.sheets[sheet] = old.sheets[sheet];
      continue;
    }
    const all = await listAllRecords(tableId);
    const published = all.filter(
      (r) => String(r.Trang_thai ?? "") === "Da_duyet" && String(r.Tinh ?? "") === PROVINCE,
    );
    console.log(`${sheet}: ${published.length} published`);
    const oldRows = oldBySheet.get(sheet) ?? new Map();
    const outRows = [];
    for (const rec of published) {
      const atts = attList(rec.Anh);
      const sig = attSig(atts);
      fpParts.push(`${sheet}:${rec.Id}:${String(rec.UpdatedAt ?? "")}:${sig}`);
      const fields = {};
      for (const [k, v] of Object.entries(rec)) {
        if (k === "Id" || k === "CreatedAt" || k === "UpdatedAt" || k === "Anh") continue;
        fields[k] = v == null ? "" : String(v);
      }
      const prev = oldRows.get(rec.Id);
      const photoRels = [];
      if (prev && prev.sig === sig && prev.photos?.length) {
        photoRels.push(...prev.photos);
        photosKept += prev.photos.length;
      } else {
        for (let i = 0; i < atts.length; i++) {
          const att = atts[i];
          const rel = path.join("photos", sheet, String(rec.Id), `${i}.${extOf(att)}`);
          const abs = path.join(cacheDir, rel);
          try {
            await downloadAtt(att, abs);
            photoRels.push(rel.replace(/\\/g, "/"));
            photosDownloaded++;
          } catch (e) {
            console.log(`  photo fail ${sheet}/${rec.Id}/${i}: ${e.message}`);
          }
        }
      }
      outRows.push({
        id: rec.Id,
        updatedAt: String(rec.UpdatedAt ?? ""),
        fields,
        photos: photoRels,
        sig,
      });
      rows++;
    }
    index.sheets[sheet] = { rows: outRows };
  }

  fpParts.sort();
  index.serverFingerprint = fpParts.join("\n");
  index.serverRowCount = rows;
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(oldPath, JSON.stringify(index, null, 2));
  console.log(
    `\nDONE: ${rows} rows, ${photosDownloaded} photos downloaded, ${photosKept} kept → ${oldPath}`,
  );
}

main().catch((e) => {
  console.error("SYNC FAILED:", e.message);
  process.exit(1);
});
