/**
 * Add (or fix) a member on base "Riviu Đà Lạt" with Editor role.
 * Workspace invite alone is NOT enough — base role must be set.
 *
 * Usage:
 *   $env:GP_ADMIN_PW="..."
 *   node deploy/add-base-member.mjs cattfan239@gmail.com editor
 */
const NC = (process.env.NC_URL ?? "http://192.168.110.101:8080").replace(/\/$/, "");
const BASE_ID = process.env.GP_BASE_ID ?? "pcq7mr8crku2d9o";
const ADMIN_EMAIL = process.env.GP_ADMIN_EMAIL ?? "riviudalat@riviu.vn";
const ADMIN_PW = process.env.GP_ADMIN_PW;
const email = process.argv[2];
const role = process.argv[3] ?? "editor";

if (!ADMIN_PW) throw new Error("Missing GP_ADMIN_PW");
if (!email) throw new Error("Usage: node deploy/add-base-member.mjs <email> [editor|viewer|owner]");

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

  await api(
    "POST",
    `/api/v2/meta/bases/${BASE_ID}/users`,
    { email, roles: role },
    token,
  );

  const users = await api("GET", `/api/v2/meta/bases/${BASE_ID}/users`, undefined, token);
  const row = (users.users?.list ?? []).find((u) => u.email === email);
  console.log(`OK: ${email}`);
  console.log(`  base role     : ${row?.roles ?? "(none)"}`);
  console.log(`  workspace role: ${row?.workspace_roles ?? "(none)"}`);
  console.log("\nUser should open workspace **Default Workspace** → base **Riviu Đà Lạt**.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
