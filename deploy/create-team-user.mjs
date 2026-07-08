/**
 * Create a team account with password + Editor on base "Riviu Đà Lạt".
 * No email invite needed — admin shares URL + credentials manually.
 *
 * Usage:
 *   $env:GP_ADMIN_PW="<mật khẩu admin, xem deploy/CREDENTIALS.local.md>"
 *   node deploy/create-team-user.mjs ten@riviu.vn MatKhau2026!
 *
 * Reset broken account (delete + recreate):
 *   node deploy/create-team-user.mjs cattfan239@gmail.com MatKhau2026! --reset
 *
 * Env: NC_URL, GP_BASE_ID, GP_WORKSPACE_ID, GP_ADMIN_EMAIL, GP_ADMIN_PW
 * Optional SSH for invite_accepted fix: GP_SSH=riviu@192.168.110.101
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const NC = (process.env.NC_URL ?? "http://192.168.110.101:8080").replace(/\/$/, "");
const BASE_ID = process.env.GP_BASE_ID ?? "pcq7mr8crku2d9o";
const WS_ID = process.env.GP_WORKSPACE_ID ?? "wc2aph6q";
const ADMIN_EMAIL = process.env.GP_ADMIN_EMAIL ?? "riviudalat@riviu.vn";
const ADMIN_PW = process.env.GP_ADMIN_PW;
const SSH_TARGET = process.env.GP_SSH ?? "riviu@192.168.110.101";
const SSH_KEY =
  process.env.GP_SSH_KEY ??
  path.join(process.env.USERPROFILE ?? process.env.HOME ?? "", ".ssh", "genposter_vps");

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const reset = process.argv.includes("--reset");
const email = args[0];
const password = args[1];
const role = args[2] ?? "editor";

if (!ADMIN_PW) throw new Error("Missing GP_ADMIN_PW");
if (!email || !password) {
  throw new Error("Usage: node deploy/create-team-user.mjs <email> <password> [editor|viewer] [--reset]");
}
if (password.length < 8) throw new Error("Password must be at least 8 characters");

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
    const msg = json?.msg ?? json?.message ?? text.slice(0, 300);
    throw new Error(`${method} ${url} -> ${res.status}: ${msg}`);
  }
  return json;
}

function runSql(sql) {
  const sshArgs = [
    "-i",
    SSH_KEY,
    "-o",
    // Accept a new host key non-interactively (needed for unattended runs)
    // but still refuse to connect if a known host's key ever changes —
    // unlike StrictHostKeyChecking=no, this still protects later runs.
    "StrictHostKeyChecking=accept-new",
    SSH_TARGET,
    "docker exec -i genposter-postgres-1 psql -U genposter -d genposter",
  ];
  const r = spawnSync("ssh", sshArgs, { input: sql, encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`SQL via SSH failed: ${r.stderr || r.stdout}`);
  }
  return r.stdout;
}

function esc(s) {
  return s.replace(/'/g, "''");
}

async function deleteUser(email) {
  const e = esc(email);
  runSql(`
DELETE FROM nc_base_users_v2 WHERE fk_user_id IN (SELECT id FROM nc_users_v2 WHERE email = '${e}');
DELETE FROM workspace_user WHERE fk_user_id IN (SELECT id FROM nc_users_v2 WHERE email = '${e}');
DELETE FROM notification WHERE fk_user_id IN (SELECT id FROM nc_users_v2 WHERE email = '${e}');
DELETE FROM nc_users_v2 WHERE email = '${e}';
`);
  console.log(`Removed old account: ${email}`);
}

async function acceptInvite(email) {
  const e = esc(email);
  const out = runSql(`
UPDATE workspace_user wu
SET invite_accepted = true, updated_at = NOW()
FROM nc_users_v2 u
WHERE wu.fk_user_id = u.id AND u.email = '${e}' AND wu.fk_workspace_id = '${WS_ID}';
UPDATE nc_users_v2 SET is_new_user = false, updated_at = NOW() WHERE email = '${e}';
SELECT u.email, wu.invite_accepted, b.roles AS base_role
FROM nc_users_v2 u
LEFT JOIN workspace_user wu ON wu.fk_user_id = u.id AND wu.fk_workspace_id = '${WS_ID}'
LEFT JOIN nc_base_users_v2 b ON b.fk_user_id = u.id AND b.base_id = '${BASE_ID}'
WHERE u.email = '${e}';
`);
  console.log(out.trim());
}

async function main() {
  const { token } = await api("POST", "/api/v1/auth/user/signin", {
    email: ADMIN_EMAIL,
    password: ADMIN_PW,
  });

  if (reset) {
    try {
      await deleteUser(email);
    } catch (e) {
      console.warn(String(e.message));
    }
  }

  const settings = await api("GET", "/api/v1/app-settings", undefined, token);
  const inviteOnly = settings.invite_only_signup;
  if (inviteOnly) {
    await api("POST", "/api/v1/app-settings", { invite_only_signup: false }, token);
  }

  try {
    await api("POST", "/api/v1/auth/user/signup", { email, password });
    console.log(`Account created: ${email}`);
  } catch (e) {
    if (!String(e.message).includes("already exist")) throw e;
    console.log(`Account exists, updating access: ${email}`);
  } finally {
    if (inviteOnly) {
      await api("POST", "/api/v1/app-settings", { invite_only_signup: true }, token);
    }
  }

  try {
    await api("POST", `/api/v2/meta/bases/${BASE_ID}/users`, { email, roles: role }, token);
  } catch (e) {
    if (!String(e.message).includes("already exists")) throw e;
    const users = await api("GET", `/api/v2/meta/bases/${BASE_ID}/users`, undefined, token);
    const row = (users.users?.list ?? []).find((u) => u.email === email);
    if (row?.id) {
      await api(
        "PATCH",
        `/api/v2/meta/bases/${BASE_ID}/users/${row.id}`,
        { roles: role, workspace_roles: "workspace-level-editor" },
        token,
      );
    }
  }

  acceptInvite(email);

  const login = await api("POST", "/api/v1/auth/user/signin", { email, password });
  if (!login.token) throw new Error("Login test failed after create");

  console.log("\n=== DONE ===");
  console.log(`URL     : ${NC}/signin/`);
  console.log(`Base    : ${NC}/nc/${BASE_ID}`);
  console.log(`Email   : ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Role    : ${role}`);
  console.log("\nGửi 3 dòng trên cho nhân viên qua Zalo/Telegram. Không dùng link email.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
