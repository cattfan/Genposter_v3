import type { Job, SlidePayload } from "@genposter/template-schema";

const DATA_API = (import.meta.env.VITE_DATA_API as string) ?? "http://127.0.0.1:8756";
const RENDER_API = (import.meta.env.VITE_RENDER_API as string) ?? "http://127.0.0.1:8777";

async function get<T>(base: string, path: string): Promise<T> {
  const res = await fetch(base + path);
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

async function post<T>(base: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export interface SheetInfo {
  sheet: string;
  label: string;
  photos: string | null;
  rows?: number;
  columns?: string[];
  error?: string;
}

export interface RecipeInfo {
  file: string;
  name?: string;
  template_id?: string;
  sheet?: string;
  error?: string;
}

export const api = {
  dataBase: DATA_API,
  renderBase: RENDER_API,

  health: () => get<{ ok: boolean }>(DATA_API, "/health"),
  sheets: () => get<SheetInfo[]>(DATA_API, "/sheets"),
  sheetRows: (sheet: string, limit = 30) =>
    get<{ sheet: string; count: number; rows: Record<string, unknown>[] }>(
      DATA_API,
      `/sheets/${encodeURIComponent(sheet)}/rows?limit=${limit}`,
    ),
  recipes: () => get<RecipeInfo[]>(DATA_API, "/recipes"),
  buildFromFile: (recipe: string) =>
    post<SlidePayload & { output?: Record<string, unknown> }>(DATA_API, "/build-file", { recipe }),

  fileUrl: (path: string) => `${DATA_API}/file?path=${encodeURIComponent(path)}`,

  renderHealth: () => get<{ ok: boolean }>(RENDER_API, "/health"),
  render: (job: unknown) => post<{ id: string }>(RENDER_API, "/render", job),
  job: (id: string) => get<Job & { items: { idx: number; file: string }[] }>(RENDER_API, `/jobs/${id}`),
  jobs: () => get<Job[]>(RENDER_API, "/jobs"),

  templates: () => get<{ id: string; name?: string; archetype?: string; file: string }[]>(DATA_API, "/templates"),
  getTemplate: (id: string) => get<Record<string, unknown>>(DATA_API, `/templates/${encodeURIComponent(id)}`),
  saveTemplate: (id: string, body: Record<string, unknown>) =>
    fetch(`${DATA_API}/templates/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (res) => {
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ ok: boolean; id: string }>;
    }),

  previewUrl: (path: string) => `${RENDER_API}/preview-file?path=${encodeURIComponent(path)}`,
};
