/**
 * Set a user's password on self-hosted NocoDB (no email needed).
 *
 * Usage:
 *   $env:GP_ADMIN_PW="<mật khẩu admin, xem deploy/CREDENTIALS.local.md>"
 *   node deploy/set-user-password.mjs ten@riviu.vn MatKhauMoi2026!
 */
const NC = (process.env.NC_URL ?? "http://192.168.110.101:8080").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.GP_ADMIN_EMAIL ?? "riviudalat@riviu.vn";
const ADMIN_PW = process.env.GP_ADMIN_PW;
const email = process.argv[2];
const newPassword = process.argv[3];

if (!ADMIN_PW) throw new Error("Missing GP_ADMIN_PW");
if (!email || !newPassword) {
  throw new Error("Usage: node deploy/set-user-password.mjs <email> <new-password>");
}
if (newPassword.length < 8) throw new Error("Password must be at least 8 characters");

async function api(method, url, body, token) {
  const res = await fetch(`${NC}${url}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { "xc-auth": token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${url} -> ${res.status}: ${json?.msg ?? text.slice(0, 200)}`);
  }
  return json;
}

async function main() {
  const { token } = await api("POST", "/api/v1/auth/user/signin", {
    email: ADMIN_EMAIL,
    password: ADMIN_PW,
  });

  const settings = await api("GET", "/api/v1/app-settings", undefined, token);
  const inviteOnly = settings.invite_only_signup;

  if (inviteOnly) {
    await api("POST", "/api/v1/app-settings", { invite_only_signup: false }, token);
  }

  const tmpEmail = `tmp-${Date.now()}@genposter.local`;
  try {
    await api("POST", "/api/v1/auth/user/signup", { email: tmpEmail, password: newPassword });
  } finally {
    if (inviteOnly) {
      await api("POST", "/api/v1/app-settings", { invite_only_signup: true }, token);
    }
  }

  const sql = `UPDATE nc_users_v2 dst
SET password = src.password, salt = src.salt, updated_at = NOW()
FROM nc_users_v2 src
WHERE dst.email = '${email.replace(/'/g, "''")}' AND src.email = '${tmpEmail.replace(/'/g, "''")}';
DELETE FROM nc_users_v2 WHERE email = '${tmpEmail.replace(/'/g, "''")}';`;

  console.log("Password hash ready. Run this on the server:\n");
  console.log(`docker exec -i genposter-postgres-1 psql -U genposter -d genposter <<'SQL'\n${sql}\nSQL`);
  console.log(`\nLogin: ${NC}/signin/`);
  console.log(`Email: ${email}`);
  console.log(`Password: (the one you passed to this script)`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
