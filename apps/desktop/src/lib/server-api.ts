/** Minimal NocoDB v2 REST client for the data server. */
import { settings, type ServerSettings } from "./settings.js";

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

function baseUrl(s: ServerSettings = cfg()): string {
  return s.url.replace(/\/$/, "");
}

async function api<T>(path: string, s: ServerSettings = cfg()): Promise<T> {
  const res = await fetch(`${baseUrl(s)}${path}`, {
    headers: { "xc-token": s.token },
  });
  if (!res.ok) {
    throw new Error(`Server ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return (await res.json()) as T;
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

/** All records of a table (paginated fetch, ~1k rows max expected). */
export async function listAllRecords(
  tableId: string,
  s: ServerSettings = cfg(),
): Promise<NcRecord[]> {
  const out: NcRecord[] = [];
  let offset = 0;
  const limit = 200;
  for (;;) {
    const j = await api<{ list?: NcRecord[]; pageInfo?: { isLastPage?: boolean } }>(
      `/api/v2/tables/${tableId}/records?limit=${limit}&offset=${offset}`,
      s,
    );
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
  const url =
    att.signedUrl ??
    (att.signedPath ? `${baseUrl(s)}/${att.signedPath}` : null) ??
    att.url ??
    (att.path ? `${baseUrl(s)}/${att.path}` : null);
  if (!url) throw new Error("Attachment has no url/path");
  const res = await fetch(url, { headers: { "xc-token": s.token } });
  if (!res.ok) throw new Error(`Attachment ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Quick connectivity test: returns table titles. */
export async function testServer(s: ServerSettings): Promise<string[]> {
  const tables = await listServerTables(s);
  return [...tables.keys()];
}
