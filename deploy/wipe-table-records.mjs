/**
 * Delete all records from every table in the NocoDB base (keeps schema).
 * Run before a clean re-import. Requires GP_ADMIN_PW + NC_BASE_ID.
 */
const NC = (process.env.NC_URL ?? "http://localhost:8080").replace(/\/$/, "");
const BASE_ID = process.env.NC_BASE_ID;
if (!BASE_ID) throw new Error("NC_BASE_ID required");

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
    body: JSON.stringify({ description: `wipe-${Date.now()}` }),
  });
  if (!tk.ok) throw new Error(`token ${tk.status}`);
  const tj = await tk.json();
  return { "xc-token": tj.token };
}

async function main() {
  const H = await mintToken();
  const tables = await (
    await fetch(`${NC}/api/v2/meta/bases/${BASE_ID}/tables`, { headers: H })
  ).json();
  let total = 0;
  for (const t of tables.list ?? []) {
    let deleted = 0;
    for (;;) {
      const page = await (
        await fetch(`${NC}/api/v2/tables/${t.id}/records?limit=100&offset=0&fields=Id`, {
          headers: H,
        })
      ).json();
      const ids = (page.list ?? []).map((r) => r.Id);
      if (!ids.length) break;
      const del = await fetch(`${NC}/api/v2/tables/${t.id}/records`, {
        method: "DELETE",
        headers: { "content-type": "application/json", ...H },
        body: JSON.stringify(ids.map((Id) => ({ Id }))),
      });
      if (!del.ok) throw new Error(`delete ${t.title}: ${del.status} ${(await del.text()).slice(0, 200)}`);
      deleted += ids.length;
    }
    console.log(`${t.title}: deleted ${deleted}`);
    total += deleted;
  }
  console.log(`DONE: wiped ${total} records`);
}

main().catch((e) => {
  console.error("WIPE FAILED:", e.message);
  process.exit(1);
});
