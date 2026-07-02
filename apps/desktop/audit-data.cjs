/* One-off audit: verify Excel sheets <-> mapping.yaml <-> photo folders. */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const yaml = require("js-yaml");

const ROOT = path.resolve(__dirname, "../..");
const mapping = yaml.load(fs.readFileSync(path.join(ROOT, "data/mapping.yaml"), "utf8"));
const wb = XLSX.readFile(path.join(ROOT, "data", mapping.database));

function stripDiacritics(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}
function norm(s) {
  return stripDiacritics(String(s ?? "")).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

console.log("=== 1. Sheet names: Excel vs mapping.yaml ===");
const excelSheets = wb.SheetNames;
const mappedSheets = Object.keys(mapping.sheets);
console.log("Excel:", JSON.stringify(excelSheets));
for (const ms of mappedSheets) {
  const hit = excelSheets.includes(ms);
  console.log(`${hit ? "OK " : "MISS"} mapping "${ms}" ${hit ? "" : "-> KHONG co trong Excel"}`);
}
for (const es of excelSheets) {
  if (!mappedSheets.includes(es)) console.log(`INFO Excel sheet "${es}" khong co trong mapping (bo qua)`);
}

console.log("\n=== 2. Column headers per sheet ===");
for (const [sheetName, sm] of Object.entries(mapping.sheets)) {
  const ws = wb.Sheets[sheetName];
  if (!ws) continue;
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const missing = Object.entries(sm.fields).filter(([, header]) => !cols.includes(header));
  if (missing.length) {
    console.log(`WARN ${sheetName}: thieu cot ${JSON.stringify(missing)} | cot thuc te: ${JSON.stringify(cols)}`);
  } else {
    console.log(`OK   ${sheetName}: ${rows.length} dong, du ${Object.keys(sm.fields).length} cot map`);
  }
}

console.log("\n=== 3. Photo folders: mapping path vs disk ===");
for (const [slug, g] of Object.entries(mapping.photos)) {
  const abs = path.join(ROOT, "data", g.path);
  const exists = fs.existsSync(abs);
  let subdirs = 0, files = 0;
  if (exists) {
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      if (e.isDirectory()) subdirs++;
      else files++;
    }
  }
  console.log(`${exists ? "OK " : "MISS"} ${slug} -> ${g.path} (${subdirs} thu muc con, ${files} file roi)`);
}

console.log("\n=== 4. Link_drive match rate per sheet ===");
const exts = (mapping.image_extensions ?? [".jpg", ".jpeg", ".png", ".webp"]).map((e) => e.toLowerCase());
for (const [sheetName, sm] of Object.entries(mapping.sheets)) {
  if (!sm.photos) continue;
  const ws = wb.Sheets[sheetName];
  if (!ws) continue;
  const g = mapping.photos[sm.photos];
  const abs = path.join(ROOT, "data", g.path);
  if (!fs.existsSync(abs)) { console.log(`MISS ${sheetName}: thu muc anh khong ton tai`); continue; }

  const subdirNorms = [];
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const imgs = fs.readdirSync(path.join(abs, e.name)).filter((f) => exts.some((x) => f.toLowerCase().endsWith(x)));
    if (imgs.length) subdirNorms.push({ raw: e.name, n: norm(e.name), count: imgs.length });
  }

  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  const keyHeader = sm.fields.photo_key;
  const nameHeader = sm.fields.name;
  let matched = 0;
  const misses = [];
  for (const r of rows) {
    const keyN = norm(r[keyHeader]);
    const nameN = norm(nameHeader ? r[nameHeader] : "");
    let hit = false;
    if (subdirNorms.length) {
      hit = subdirNorms.some((d) => keyN && (d.n === keyN || d.n.includes(keyN) || keyN.includes(d.n)));
      if (!hit && nameN) hit = subdirNorms.some((d) => d.n === nameN || d.n.includes(nameN) || nameN.includes(d.n));
    }
    if (hit) matched++;
    else misses.push(String(r[keyHeader] || r[nameHeader] || "?").slice(0, 50));
  }
  const pct = rows.length ? Math.round((matched / rows.length) * 100) : 0;
  console.log(`${pct === 100 ? "OK  " : pct >= 90 ? "WARN" : "BAD "} ${sheetName}: ${matched}/${rows.length} dong khop thu muc anh (${pct}%)${subdirNorms.length === 0 ? " [khong co thu muc con -> dung fallback]" : ""}`);
  if (misses.length && misses.length <= 12) console.log(`      khong khop: ${misses.join(" | ")}`);
  else if (misses.length) console.log(`      khong khop (${misses.length}): ${misses.slice(0, 10).join(" | ")} ...`);
}
