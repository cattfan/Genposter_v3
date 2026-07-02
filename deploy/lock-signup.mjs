/** Enforce invite-only signup via app settings and remove the probe account. */
const NC = (process.env.NC_URL ?? "http://180.93.114.89:8080").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.GP_ADMIN_EMAIL ?? "admin@genposter.vn";

const signin = await fetch(`${NC}/api/v1/auth/user/signin`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    email: ADMIN_EMAIL,
    password: process.env.GP_ADMIN_PW,
  }),
});
if (!signin.ok) throw new Error(`signin ${signin.status}`);
const { token } = await signin.json();
const H = { "content-type": "application/json", "xc-auth": token };

// 1. Invite-only signup (app settings, super-admin only).
const set = await fetch(`${NC}/api/v1/app-settings`, {
  method: "POST",
  headers: H,
  body: JSON.stringify({ invite_only_signup: true }),
});
console.log("app-settings invite_only:", set.status, (await set.text()).slice(0, 120));

// 2. Remove any probe/stray accounts.
const usersRes = await fetch(`${NC}/api/v1/users?limit=100`, { headers: H });
const users = await usersRes.json();
const keep = new Set([ADMIN_EMAIL, "admin@genposter.vn", "data@genposter.vn", "app@genposter.vn"]);
for (const u of users.list ?? []) {
  if (keep.has(u.email)) continue;
  const del = await fetch(`${NC}/api/v1/users/${u.id}`, { method: "DELETE", headers: H });
  console.log(`delete ${u.email}:`, del.status);
}

// 3. Verify: signup should now fail.
const probe = await fetch(`${NC}/api/v1/auth/user/signup`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "hacker2@test.com", password: "Test12345678" }),
});
console.log("signup after lock (expect 400):", probe.status);

const list2 = await fetch(`${NC}/api/v1/users?limit=100`, { headers: H });
console.log(
  "remaining users:",
  ((await list2.json()).list ?? []).map((u) => `${u.email}(${u.roles})`).join(", "),
);
