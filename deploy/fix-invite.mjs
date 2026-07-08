/**
 * Fix invited user who confirmed email but sees empty personal workspace.
 * Sets workspace invite accepted + ensures base Editor role.
 *
 * Usage:
 *   $env:GP_ADMIN_PW="..."
 *   node deploy/fix-invite.mjs cattfan239@gmail.com
 */
const NC = (process.env.NC_URL ?? "http://192.168.110.101:8080").replace(/\/$/, "");
const BASE_ID = process.env.GP_BASE_ID ?? "pcq7mr8crku2d9o";
const WS_ID = process.env.GP_WORKSPACE_ID ?? "wc2aph6q";
const ADMIN_EMAIL = process.env.GP_ADMIN_EMAIL ?? "riviudalat@riviu.vn";
const ADMIN_PW = process.env.GP_ADMIN_PW;
const email = process.argv[2];

if (!ADMIN_PW) throw new Error("Missing GP_ADMIN_PW");
if (!email) throw new Error("Usage: node deploy/fix-invite.mjs <email>");

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

  try {
    await api("POST", `/api/v2/meta/bases/${BASE_ID}/users`, { email, roles: "editor" }, token);
  } catch (e) {
    if (!String(e.message).includes("already exists")) throw e;
  }

  const users = await api("GET", `/api/v2/meta/bases/${BASE_ID}/users`, undefined, token);
  const row = (users.users?.list ?? []).find((u) => u.email === email);
  if (!row?.id) throw new Error(`User not found on base: ${email}`);

  await api(
    "PATCH",
    `/api/v2/meta/bases/${BASE_ID}/users/${row.id}`,
    { roles: "editor", workspace_roles: "workspace-level-editor" },
    token,
  );

  console.log(`API OK: ${email} -> editor on Riviu Đà Lạt`);
  console.log(`User id: ${row.fk_user_id ?? row.id}`);
  console.log("\nRun on server (Postgres) to accept workspace invite:");
  console.log(`  UPDATE workspace_user SET invite_accepted = true`);
  console.log(`  WHERE fk_user_id = '${row.fk_user_id ?? row.id}' AND fk_workspace_id = '${WS_ID}';`);
  console.log(`\nDirect link for user:`);
  console.log(`  ${NC}/nc/${BASE_ID}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
