/**
 * Initialize NocoDB: admin account, "Genposter Data" base, one table per
 * Excel sheet (exact same columns) plus Anh/Trang_thai/Tinh, staff accounts
 * with roles, and a read-only API token for the app.
 *
 * Run locally (needs data/ + apps/desktop/node_modules):
 *   node deploy/setup-nocodb.mjs
 * Env: NC_URL, GP_ADMIN_PW, GP_EDITOR_PW, GP_SYNC_PW
 */
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(path.join(ROOT, "apps/desktop/package.json"));
const XLSX = req("xlsx");
const yaml = req("js-yaml");
const fs = req("fs");

const NC_URL = (process.env.NC_URL ?? "http://180.93.114.89:8080").replace(/\/$/, "");
const ADMIN = {
  email: process.env.GP_ADMIN_EMAIL ?? "admin@genposter.vn",
  password: required("GP_ADMIN_PW"),
};
const EDITOR = {
  email: process.env.GP_EDITOR_EMAIL ?? "data@genposter.vn",
  password: required("GP_EDITOR_PW"),
};
const SYNC = {
  email: process.env.GP_SYNC_EMAIL ?? "app@genposter.vn",
  password: required("GP_SYNC_PW"),
};
const BASE_TITLE = process.env.GP_BASE_TITLE ?? "Genposter Data";

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function api(method, url, body, token) {
  const res = await fetch(`${NC_URL}${url}`, {
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
    const err = new Error(`${method} ${url} -> ${res.status}: ${msg}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function signupOrSignin(user) {
  try {
    const r = await api("POST", "/api/v1/auth/user/signup", user);
    if (r.token) return r.token;
  } catch (e) {
    if (e.status !== 400 && e.status !== 409) throw e;
  }
  const r = await api("POST", "/api/v1/auth/user/signin", user);
  return r.token;
}

/** Column type overrides; everything else = SingleLineText. */
const LONG_TEXT = new Set(["Mo_ta", "Giai_thich", "Huong_di", "Mon_an_noi_bat", "Noi_bat"]);

function excelColumns(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet not in Excel: ${sheetName}`);
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  return (grid[0] ?? []).map((h) => String(h).trim()).filter(Boolean);
}

async function main() {
  console.log(`NocoDB at ${NC_URL}`);

  const adminToken = await signupOrSignin(ADMIN);
  console.log("admin ok");

  // Base: reuse if a previous run already created it.
  const bases = await api("GET", "/api/v2/meta/bases", undefined, adminToken);
  let base = (bases.list ?? []).find((b) => b.title === BASE_TITLE);
  if (!base) {
    base = await api("POST", "/api/v2/meta/bases", { title: BASE_TITLE }, adminToken);
    console.log(`base created: ${base.id}`);
  } else {
    console.log(`base exists: ${base.id}`);
  }

  const mapping = yaml.load(fs.readFileSync(path.join(ROOT, "data/mapping.yaml"), "utf8"));
  const wb = XLSX.readFile(path.join(ROOT, "data", mapping.database));

  const existing = await api(
    "GET",
    `/api/v2/meta/bases/${base.id}/tables`,
    undefined,
    adminToken,
  );
  const existingTitles = new Set((existing.list ?? []).map((t) => t.title));

  for (const sheetName of Object.keys(mapping.sheets)) {
    if (existingTitles.has(sheetName)) {
      console.log(`table exists, skip: ${sheetName}`);
      continue;
    }
    const cols = excelColumns(wb, sheetName);
    const columns = [
      ...cols.map((h) => ({
        column_name: h,
        title: h,
        uidt: LONG_TEXT.has(h) ? "LongText" : "SingleLineText",
      })),
      { column_name: "Anh", title: "Anh", uidt: "Attachment" },
      {
        column_name: "Trang_thai",
        title: "Trang_thai",
        uidt: "SingleSelect",
        dtxp: "'Nhap','Da_duyet','Xoa'",
        cdf: "'Nhap'",
      },
      {
        column_name: "Tinh",
        title: "Tinh",
        uidt: "SingleSelect",
        dtxp: "'dalat'",
        cdf: "'dalat'",
      },
    ];
    const t = await api(
      "POST",
      `/api/v2/meta/bases/${base.id}/tables`,
      { table_name: sheetName, title: sheetName, columns },
      adminToken,
    );
    console.log(`table created: ${sheetName} (${t.id}) with ${columns.length} cols`);
  }

  // Staff + app accounts, then attach to the base with proper roles.
  await signupOrSignin(EDITOR);
  const syncToken = await signupOrSignin(SYNC);
  for (const [email, role] of [
    [EDITOR.email, "editor"],
    [SYNC.email, "viewer"],
  ]) {
    try {
      await api(
        "POST",
        `/api/v2/meta/bases/${base.id}/users`,
        { email, roles: role },
        adminToken,
      );
      console.log(`base user: ${email} = ${role}`);
    } catch (e) {
      if (e.status === 400 && String(e.message).includes("exist")) {
        console.log(`base user exists: ${email}`);
      } else throw e;
    }
  }

  // Read-only API token created AS the viewer account.
  const tokens = await api("GET", "/api/v1/tokens", undefined, syncToken).catch(() => ({
    list: [],
  }));
  let appToken = (tokens.list ?? []).find((t) => t.description === "genposter-app-sync");
  if (!appToken) {
    appToken = await api(
      "POST",
      "/api/v1/tokens",
      { description: "genposter-app-sync" },
      syncToken,
    );
    console.log("app API token created");
  } else {
    console.log("app API token exists");
  }

  console.log("\n=== RESULT ===");
  console.log(`base_id=${base.id}`);
  console.log(`app_api_token=${appToken.token}`);
}

main().catch((e) => {
  console.error("SETUP FAILED:", e.message);
  if (e.body) console.error(JSON.stringify(e.body).slice(0, 500));
  process.exit(1);
});
