/** Quick health check: signup lock, read-only token, table list. */
const NC = process.env.NC_URL ?? "http://192.168.110.101:8080";
const TOKEN = process.env.NC_APP_TOKEN ?? "";
const BASE = process.env.NC_BASE_ID ?? "pcq7mr8crku2d9o";
if (!TOKEN) throw new Error("Set NC_APP_TOKEN (see deploy/CREDENTIALS.local.md)");

const signup = await fetch(`${NC}/api/v1/auth/user/signup`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "hacker@test.com", password: "Test12345678" }),
});
console.log("signup status (expect 400):", signup.status);

const tables = await fetch(`${NC}/api/v2/meta/bases/${BASE}/tables`, {
  headers: { "xc-token": TOKEN },
});
const j = await tables.json();
console.log(
  "app token table list (expect 200 x10):",
  tables.status,
  (j.list ?? []).map((t) => t.title).join(", "),
);
