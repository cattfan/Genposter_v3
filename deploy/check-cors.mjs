/** Check CORS headers NocoDB returns for cross-origin app usage. */
const NC = process.env.NC_URL ?? "http://180.93.114.89:8080";
const TOKEN = process.env.NC_APP_TOKEN ?? "ZWxcgEOibkb6dYiTdHoe9iRk4iViV9K48d8T2h4V";

const r = await fetch(`${NC}/api/v2/meta/bases/prv2zznqur45kz0/tables`, {
  headers: { "xc-token": TOKEN, Origin: "http://tauri.localhost" },
});
console.log("status:", r.status);
for (const k of [
  "access-control-allow-origin",
  "access-control-allow-headers",
  "access-control-allow-methods",
]) {
  console.log(`${k}:`, r.headers.get(k));
}

const opt = await fetch(`${NC}/api/v2/meta/bases/prv2zznqur45kz0/tables`, {
  method: "OPTIONS",
  headers: {
    Origin: "http://tauri.localhost",
    "Access-Control-Request-Method": "GET",
    "Access-Control-Request-Headers": "xc-token",
  },
});
console.log("preflight status:", opt.status);
console.log("preflight allow-origin:", opt.headers.get("access-control-allow-origin"));
console.log("preflight allow-headers:", opt.headers.get("access-control-allow-headers"));
