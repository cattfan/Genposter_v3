/** Smoke-test the exact API calls the app sync performs. */
const NC = process.env.NC_URL ?? "http://192.168.110.101:8080";
const TOKEN = process.env.NC_APP_TOKEN ?? "";
const BASE = process.env.NC_BASE_ID ?? "pcq7mr8crku2d9o";
if (!TOKEN) throw new Error("Set NC_APP_TOKEN (see deploy/CREDENTIALS.local.md)");
const H = { "xc-token": TOKEN };

const tables = await (await fetch(`${NC}/api/v2/meta/bases/${BASE}/tables`, { headers: H })).json();
const quanAn = (tables.list ?? []).find((t) => t.title === "Quan_an");

const recs = await (
  await fetch(`${NC}/api/v2/tables/${quanAn.id}/records?limit=3`, { headers: H })
).json();
const r0 = recs.list[0];
console.log("record keys:", Object.keys(r0).join(", "));
console.log("Trang_thai:", r0.Trang_thai, "| Tinh:", r0.Tinh, "| UpdatedAt:", r0.UpdatedAt);

const atts = typeof r0.Anh === "string" ? JSON.parse(r0.Anh) : (r0.Anh ?? []);
console.log("attachments:", atts.length);
if (atts[0]) {
  console.log("att keys:", Object.keys(atts[0]).join(", "));
  const a = atts[0];
  const url = a.signedUrl ?? (a.signedPath ? `${NC}/${a.signedPath}` : `${NC}/${a.path}`);
  const img = await fetch(url, { headers: H });
  console.log("download:", img.status, img.headers.get("content-type"));
}
