/**
 * Import current Excel + photo folders into NocoDB.
 *
 * For every mapped sheet: read rows, match the photo subfolder (same
 * normalized matching the app uses), upload the images, create the record
 * with Trang_thai=Da_duyet / Tinh=dalat. Resumable via import-state.local.json.
 *
 * Run from repo root:  node deploy/import-to-nocodb.mjs [--limit N] [--sheet Name]
 * Env: GP_ADMIN_PW (to mint an API token), NC_URL optional.
 */
import { createRequire } from "module";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(path.join(ROOT, "apps/desktop/package.json"));
const XLSX = req("xlsx");
const yaml = req("js-yaml");

const NC = (process.env.NC_URL ?? "http://180.93.114.89:8080").replace(/\/$/, "");
const BASE_ID = process.env.NC_BASE_ID ?? "prv2zznqur45kz0";
const STATE_FILE = path.join(ROOT, "deploy/import-state.local.json");
const REPORT_FILE = path.join(ROOT, "deploy/import-report.local.md");

const argLimit = process.argv.includes("--limit")
  ? Number(process.argv[process.argv.indexOf("--limit") + 1])
  : Infinity;
const argSheet = process.argv.includes("--sheet")
  ? process.argv[process.argv.indexOf("--sheet") + 1]
  : null;

// ---------- helpers ----------
function stripDiacritics(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}
function norm(s) {
  return stripDiacritics(String(s ?? "")).toLowerCase().replace(/[^a-z0-9]+/g, "");
}
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { done: {} };
  }
}
function saveState(st) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(st));
}

let AUTH_HEADERS = {};
async function mintToken() {
  const pw = process.env.GP_ADMIN_PW;
  if (!pw) throw new Error("Missing GP_ADMIN_PW");
  const r = await fetch(`${NC}/api/v1/auth/user/signin`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: process.env.GP_ADMIN_EMAIL ?? "admin@genposter.vn",
      password: pw,
    }),
  });
  if (!r.ok) throw new Error(`signin ${r.status}`);
  const { token } = await r.json();
  const tk = await fetch(`${NC}/api/v1/tokens`, {
    method: "POST",
    headers: { "content-type": "application/json", "xc-auth": token },
    body: JSON.stringify({ description: `import-${Date.now()}` }),
  });
  if (!tk.ok) throw new Error(`token ${tk.status}`);
  const tj = await tk.json();
  AUTH_HEADERS = { "xc-token": tj.token };
}

async function apiJson(method, url, body) {
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(`${NC}${url}`, {
        method,
        headers: { "content-type": "application/json", ...AUTH_HEADERS },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`${method} ${url} -> ${r.status}: ${(await r.text()).slice(0, 200)}`);
      return await r.json();
    } catch (e) {
      if (attempt >= 4) throw e;
      await new Promise((res) => setTimeout(res, attempt * 1500));
    }
  }
}

async function uploadFile(absPath) {
  const name = path.basename(absPath);
  const ext = path.extname(name).toLowerCase();
  const bytes = fs.readFileSync(absPath);
  for (let attempt = 1; ; attempt++) {
    try {
      const fd = new FormData();
      fd.append("file", new Blob([bytes], { type: MIME[ext] ?? "application/octet-stream" }), name);
      const r = await fetch(
        `${NC}/api/v2/storage/upload?path=${encodeURIComponent("genposter/photos")}`,
        { method: "POST", headers: AUTH_HEADERS, body: fd },
      );
      if (!r.ok) throw new Error(`upload ${name} -> ${r.status}: ${(await r.text()).slice(0, 200)}`);
      const arr = await r.json();
      return Array.isArray(arr) ? arr[0] : arr;
    } catch (e) {
      if (attempt >= 4) throw e;
      await new Promise((res) => setTimeout(res, attempt * 2000));
    }
  }
}

// ---------- photo index (same strategy as apps/desktop/src/lib/photos.ts) ----------
function buildGroupIndex(groupAbs, exts) {
  const subdirs = [];
  const rootFiles = [];
  if (!fs.existsSync(groupAbs)) return { subdirs, rootFiles };
  for (const e of fs.readdirSync(groupAbs, { withFileTypes: true })) {
    if (e.isDirectory()) {
      const imgs = fs
        .readdirSync(path.join(groupAbs, e.name))
        .filter((f) => exts.some((x) => f.toLowerCase().endsWith(x)))
        .sort()
        .map((f) => path.join(groupAbs, e.name, f));
      if (imgs.length) subdirs.push({ name: e.name, n: norm(e.name), imgs });
    } else if (exts.some((x) => e.name.toLowerCase().endsWith(x))) {
      rootFiles.push(path.join(groupAbs, e.name));
    }
  }
  rootFiles.sort();
  return { subdirs, rootFiles };
}

function matchPhotos(idx, photoKey, name) {
  const keyN = norm(photoKey);
  const nameN = norm(name);
  if (idx.subdirs.length) {
    for (const d of idx.subdirs) {
      if (keyN && (d.n === keyN || d.n.includes(keyN) || keyN.includes(d.n))) return d.imgs;
    }
    if (nameN) {
      for (const d of idx.subdirs) {
        if (d.n === nameN || d.n.includes(nameN) || nameN.includes(d.n)) return d.imgs;
      }
    }
  }
  return null;
}

// ---------- main ----------
async function main() {
  await mintToken();
  const mapping = yaml.load(fs.readFileSync(path.join(ROOT, "data/mapping.yaml"), "utf8"));
  const wb = XLSX.readFile(path.join(ROOT, "data", mapping.database));
  const exts = (mapping.image_extensions ?? [".jpg", ".jpeg", ".png", ".webp"]).map((e) => e.toLowerCase());

  const tablesRes = await apiJson("GET", `/api/v2/meta/bases/${BASE_ID}/tables`);
  const tableByTitle = new Map((tablesRes.list ?? []).map((t) => [t.title, t.id]));

  const state = loadState();
  const misses = [];
  let created = 0;
  let uploaded = 0;

  for (const [sheetName, sm] of Object.entries(mapping.sheets)) {
    if (argSheet && sheetName !== argSheet) continue;
    const tableId = tableByTitle.get(sheetName);
    if (!tableId) {
      console.log(`SKIP ${sheetName}: no table`);
      continue;
    }
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    const headers = (grid[0] ?? []).map((h) => String(h).trim()).filter(Boolean);

    const group = sm.photos ? mapping.photos[sm.photos] : null;
    const idx = group
      ? buildGroupIndex(path.join(ROOT, "data", group.path), exts)
      : { subdirs: [], rootFiles: [] };

    console.log(`=== ${sheetName}: ${rows.length} rows ===`);
    let n = 0;
    for (let i = 0; i < rows.length; i++) {
      if (n >= argLimit) break;
      const key = `${sheetName}:${i}`;
      if (state.done[key]) continue;
      n++;

      const r = rows[i];
      const record = {};
      for (const h of headers) record[h] = String(r[h] ?? "");
      record["Trang_thai"] = "Da_duyet";
      record["Tinh"] = "dalat";

      const keyHeader = sm.fields?.photo_key;
      const nameHeader = sm.fields?.name;
      const photoKey = keyHeader ? r[keyHeader] : "";
      const dispName = nameHeader ? r[nameHeader] : "";

      if (group) {
        const files = matchPhotos(idx, photoKey, dispName);
        if (files) {
          const atts = [];
          for (const f of files) {
            try {
              atts.push(await uploadFile(f));
              uploaded++;
            } catch (e) {
              console.log(`  upload fail ${path.basename(f)}: ${e.message}`);
            }
          }
          if (atts.length) record["Anh"] = atts;
        } else {
          misses.push(`${sheetName} dòng ${i + 2}: ${photoKey || dispName}`);
        }
      }

      await apiJson("POST", `/api/v2/tables/${tableId}/records`, record);
      created++;
      state.done[key] = 1;
      if (created % 10 === 0) saveState(state);
      if (created % 25 === 0)
        console.log(`  ... ${created} records, ${uploaded} photos uploaded`);
    }
    saveState(state);
  }

  saveState(state);
  const report = [
    `# Import report ${new Date().toISOString()}`,
    `Records created: ${created}`,
    `Photos uploaded: ${uploaded}`,
    ``,
    `## Rows without matched photo folder (${misses.length})`,
    ...misses.map((m) => `- ${m}`),
  ].join("\n");
  fs.writeFileSync(REPORT_FILE, report);
  console.log(`\nDONE: ${created} records, ${uploaded} photos. Misses: ${misses.length}`);
  console.log(`Report: ${REPORT_FILE}`);
}

main().catch((e) => {
  console.error("IMPORT FAILED:", e.message);
  process.exit(1);
});
