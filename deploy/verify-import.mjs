/** Compare record counts per table vs Excel rows; spot-check attachments. */
import { createRequire } from "module";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(path.join(ROOT, "apps/desktop/package.json"));
const XLSX = req("xlsx");
const yaml = req("js-yaml");

const NC = (process.env.NC_URL ?? "http://192.168.110.101:8080").replace(/\/$/, "");
const BASE_ID = process.env.NC_BASE_ID ?? "pcq7mr8crku2d9o";
const TOKEN = process.env.NC_APP_TOKEN ?? "";
if (!TOKEN) throw new Error("Set NC_APP_TOKEN (see deploy/CREDENTIALS.local.md)");
const H = { "xc-token": TOKEN };

const mapping = yaml.load(fs.readFileSync(path.join(ROOT, "data/mapping.yaml"), "utf8"));
const wb = XLSX.readFile(path.join(ROOT, "data", mapping.database));

const tablesRes = await (await fetch(`${NC}/api/v2/meta/bases/${BASE_ID}/tables`, { headers: H })).json();
const tableByTitle = new Map((tablesRes.list ?? []).map((t) => [t.title, t.id]));

let allOk = true;
for (const sheetName of Object.keys(mapping.sheets)) {
  const ws = wb.Sheets[sheetName];
  const excelRows = ws ? XLSX.utils.sheet_to_json(ws, { defval: "" }).length : 0;
  const tid = tableByTitle.get(sheetName);
  const cnt = await (
    await fetch(`${NC}/api/v2/tables/${tid}/records/count`, { headers: H })
  ).json();
  const dbRows = cnt.count ?? -1;
  const ok = dbRows === excelRows;
  if (!ok) allOk = false;
  console.log(`${ok ? "OK  " : "DIFF"} ${sheetName}: excel=${excelRows} db=${dbRows}`);
}

// Spot-check: first Quan_an record has attachments with URLs.
const qid = tableByTitle.get("Quan_an");
const rec = await (
  await fetch(`${NC}/api/v2/tables/${qid}/records?limit=1&fields=Ten_quan,Anh`, { headers: H })
).json();
const first = rec.list?.[0];
const atts = typeof first?.Anh === "string" ? JSON.parse(first.Anh) : (first?.Anh ?? []);
console.log(`\nspot-check "${first?.Ten_quan}": ${atts.length} photos`);
if (atts[0]) {
  const url = atts[0].signedUrl ?? `${NC}/${atts[0].path}`;
  const img = await fetch(url, { headers: H });
  console.log(`first photo fetch: ${img.status} ${img.headers.get("content-type")} ${img.headers.get("content-length")} bytes`);
}
console.log(allOk ? "\nALL COUNTS MATCH" : "\nSOME COUNTS DIFFER");
