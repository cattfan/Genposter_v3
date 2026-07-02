/** Best-effort branding: orange icon color for the base (Riviu Đà Lạt). */
const NC = (process.env.NC_URL ?? "http://192.168.110.101:8080").replace(/\/$/, "");
const BASE = process.env.NC_BASE_ID ?? "pcq7mr8crku2d9o";

const signin = await fetch(`${NC}/api/v1/auth/user/signin`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    email: process.env.GP_ADMIN_EMAIL ?? "riviudalat@riviu.vn",
    password: process.env.GP_ADMIN_PW,
  }),
});
const { token } = await signin.json();

const r = await fetch(`${NC}/api/v2/meta/bases/${BASE}`, {
  method: "PATCH",
  headers: { "content-type": "application/json", "xc-auth": token },
  body: JSON.stringify({
    color: "#ff6600",
    meta: JSON.stringify({ iconColor: "#ff6600" }),
  }),
});
console.log("brand base:", r.status, (await r.text()).slice(0, 120));
