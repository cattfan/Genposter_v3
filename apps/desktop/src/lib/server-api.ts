/** Minimal NocoDB v2 REST client for the data server. */
import {
  onServerSettingsInvalidate,
  type ServerSettings,
  settings,
} from "./settings.js";

export interface NcAttachment {
  title?: string;
  path?: string;
  signedPath?: string;
  url?: string;
  signedUrl?: string;
  mimetype?: string;
  size?: number;
}

export interface NcRecord {
  Id: number;
  UpdatedAt?: string;
  [key: string]: unknown;
}

function cfg(): ServerSettings {
  return settings().server;
}

function normUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function settingsKey(s: ServerSettings): string {
  return `${normUrl(s.url)}|${normUrl(s.lanUrl)}|${s.token}`;
}

let resolvedCache: { key: string; url: string } | null = null;

onServerSettingsInvalidate(() => {
  resolvedCache = null;
});

/** A stuck connection must not hang sync/polling forever. */
const REQUEST_TIMEOUT_MS = 20_000;
const ATTACHMENT_TIMEOUT_MS = 30_000;

/** The server answered, just not with 2xx — distinct from a network failure. */
class HttpStatusError extends Error {}

async function pingHealth(url: string, token: string, ms = 4000): Promise<boolean> {
  try {
    const res = await fetch(`${normUrl(url)}/api/v1/health`, {
      headers: token ? { "xc-token": token } : {},
      signal: AbortSignal.timeout(ms),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Pick Tailscale first, then LAN when at home on the same network. */
export async function resolveBaseUrl(s: ServerSettings = cfg()): Promise<string> {
  const key = settingsKey(s);
  if (resolvedCache?.key === key) return resolvedCache.url;

  const primary = normUrl(s.url);
  const lan = normUrl(s.lanUrl);
  const candidates = lan === primary ? [primary] : [primary, lan];

  for (const u of candidates) {
    if (await pingHealth(u, s.token)) {
      resolvedCache = { key, url: u };
      return u;
    }
  }

  resolvedCache = { key, url: primary };
  return primary;
}

export type ServerVia = "local" | "lan" | "tailscale" | "none";

export interface ServerTestResult {
  ok: boolean;
  url: string;
  ms: number;
  via: ServerVia;
  error?: string;
}

/** Classify which channel answered — localhost must not be labeled Tailscale. */
export function connectionVia(url: string, s: ServerSettings): ServerVia {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return "local";
  } catch {
    /* ignore bad URL */
  }
  const primary = normUrl(s.url);
  const lan = normUrl(s.lanUrl);
  if (lan && url === lan && url !== primary) return "lan";
  if (url === primary) return "tailscale";
  if (lan && url === lan) return "lan";
  return "none";
}

/** Test server reachability (uses the same URL resolution as sync). */
export async function testServerConnection(s: ServerSettings = cfg()): Promise<ServerTestResult> {
  const t0 = performance.now();
  resolvedCache = null;
  const url = await resolveBaseUrl(s);
  const ms = Math.round(performance.now() - t0);
  const via = connectionVia(url, s);

  if (await pingHealth(url, s.token)) {
    return { ok: true, url, ms, via };
  }

  return {
    ok: false,
    url: normUrl(s.url),
    ms,
    via: "none",
    error: "Không kết nối được (Local Docker / Tailscale / LAN).",
  };
}

async function fetchJson<T>(url: string, s: ServerSettings): Promise<T> {
  const res = await fetch(url, {
    headers: { "xc-token": s.token },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new HttpStatusError(`Server ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

async function api<T>(path: string, s: ServerSettings = cfg()): Promise<T> {
  const base = await resolveBaseUrl(s);
  try {
    return await fetchJson<T>(`${base}${path}`, s);
  } catch (e) {
    // The server answering with a non-2xx status is not a reason to
    // re-probe. Only a network-level failure (timeout, DNS, connection
    // refused) suggests the cached URL (Tailscale or LAN) went dead since it
    // was resolved — e.g. the user switched networks without restarting.
    if (e instanceof HttpStatusError) throw e;
    resolvedCache = null;
    const retryBase = await resolveBaseUrl(s);
    if (retryBase === base) throw e; // re-probe picked the same dead URL again
    return fetchJson<T>(`${retryBase}${path}`, s);
  }
}

/** Table title -> table id for the configured base. */
export async function listServerTables(
  s: ServerSettings = cfg(),
): Promise<Map<string, string>> {
  const j = await api<{ list?: { id: string; title: string }[] }>(
    `/api/v2/meta/bases/${s.baseId}/tables`,
    s,
  );
  return new Map((j.list ?? []).map((t) => [t.title, t.id]));
}

/**
 * All records of a table (paginated fetch, ~1k rows max expected).
 * Pass `fields` to fetch only specific columns (lighter payload for polling).
 */
export async function listAllRecords(
  tableId: string,
  s: ServerSettings = cfg(),
  fields?: string[],
): Promise<NcRecord[]> {
  const out: NcRecord[] = [];
  let offset = 0;
  const limit = 200;
  let fieldsQ = fields?.length ? `&fields=${encodeURIComponent(fields.join(","))}` : "";
  for (;;) {
    let j: { list?: NcRecord[]; pageInfo?: { isLastPage?: boolean } };
    try {
      j = await api(
        `/api/v2/tables/${tableId}/records?limit=${limit}&offset=${offset}${fieldsQ}`,
        s,
      );
    } catch (e) {
      // A table missing one of the requested columns rejects the fields
      // param — fall back to the full payload for this table.
      if (fieldsQ && /Server 4\d\d/.test(String(e))) {
        fieldsQ = "";
        continue;
      }
      throw e;
    }
    const list = j.list ?? [];
    out.push(...list);
    if (list.length < limit || j.pageInfo?.isLastPage) break;
    offset += limit;
  }
  return out;
}

/** Download one attachment as bytes. */
export async function fetchAttachment(
  att: NcAttachment,
  s: ServerSettings = cfg(),
): Promise<Uint8Array> {
  const base = await resolveBaseUrl(s);
  const url =
    att.signedUrl ??
    (att.signedPath ? `${base}/${att.signedPath}` : null) ??
    att.url ??
    (att.path ? `${base}/${att.path}` : null);
  if (!url) throw new Error("Attachment has no url/path");
  const res = await fetch(url, {
    headers: { "xc-token": s.token },
    signal: AbortSignal.timeout(ATTACHMENT_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Attachment ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

