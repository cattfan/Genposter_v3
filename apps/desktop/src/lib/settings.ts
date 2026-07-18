/** Persisted app settings (project root + AI config), stored in localStorage. */

export interface AiSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** Remote data server (NocoDB) — always used for produce/sync. */
export interface ServerSettings {
  /** Primary URL (Tailscale — works from home, office, mobile). */
  url: string;
  /** Fallback when on the same LAN as the server (faster at home). */
  lanUrl: string;
  token: string;
  baseId: string;
  province: string;
}

/** Local Docker stack (temporary while LAN/Tailscale server is offline). */
export const NC_LOCAL_URL = "http://localhost:8080";
export const NC_TAILSCALE_URL = "http://100.74.131.110:8080";
export const NC_LAN_URL = "http://192.168.110.101:8080";

export interface AppSettings {
  /** Absolute path to the Genposter project root (contains data/, templates/, ...). */
  rootDir: string;
  ai: AiSettings;
  server: ServerSettings;
}

const KEY = "genposter.settings.v1";

const DEFAULTS: AppSettings = {
  // No machine-specific guess here — an unconfigured rootDir must fail
  // obviously (see isRootDirConfigured) rather than silently pointing at a
  // path that only ever existed on the original dev machine.
  rootDir: "",
  ai: {
    baseUrl: import.meta.env.VITE_AI_BASE_URL ?? "https://api.openai.com/v1",
    apiKey: import.meta.env.VITE_AI_API_KEY ?? "",
    model: import.meta.env.VITE_AI_MODEL ?? "gpt-4o-mini",
  },
  server: {
    // Default to local Docker while the company LAN server is offline.
    // Token stays empty — paste from deploy/CREDENTIALS.local.md (Local Docker).
    url: import.meta.env.VITE_NC_URL ?? NC_LOCAL_URL,
    lanUrl: import.meta.env.VITE_NC_LAN_URL ?? NC_LOCAL_URL,
    token: import.meta.env.VITE_NC_TOKEN ?? "",
    baseId: import.meta.env.VITE_NC_BASE_ID ?? "puzatkuv7t0p8ut",
    province: import.meta.env.VITE_NC_PROVINCE ?? "dalat",
  },
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const mergedServer = { ...DEFAULTS.server, ...(parsed.server ?? {}) };
    if (!mergedServer.token) mergedServer.token = DEFAULTS.server.token;
    if (!mergedServer.url) mergedServer.url = DEFAULTS.server.url;
    if (!mergedServer.lanUrl) mergedServer.lanUrl = DEFAULTS.server.lanUrl;
    if (!mergedServer.baseId) mergedServer.baseId = DEFAULTS.server.baseId;
    if (!mergedServer.province) mergedServer.province = DEFAULTS.server.province;
    return {
      rootDir: parsed.rootDir || DEFAULTS.rootDir,
      ai: { ...DEFAULTS.ai, ...(parsed.ai ?? {}) },
      server: mergedServer,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: AppSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

let cached: AppSettings | null = null;

export function settings(): AppSettings {
  if (!cached) cached = loadSettings();
  return cached;
}

/** False until the user has picked a project folder (fresh install / new machine). */
export function isRootDirConfigured(): boolean {
  return Boolean(settings().rootDir);
}

export function setRootDir(dir: string): void {
  const s = settings();
  s.rootDir = dir.replace(/\\/g, "/").replace(/\/+$/, "");
  saveSettings(s);
  cached = s;
}

export function setAi(ai: AiSettings): void {
  const s = settings();
  s.ai = ai;
  saveSettings(s);
  cached = s;
}

export function setServer(server: ServerSettings): void {
  const s = settings();
  s.server = server;
  saveSettings(s);
  cached = s;
  invalidateResolvedServerUrl();
}

/** Cleared when server settings change — see server-api resolveBaseUrl. */
let onServerUrlInvalidate: (() => void) | null = null;

export function onServerSettingsInvalidate(cb: () => void): void {
  onServerUrlInvalidate = cb;
}

export function invalidateResolvedServerUrl(): void {
  onServerUrlInvalidate?.();
}

export function refreshSettings(): AppSettings {
  cached = loadSettings();
  invalidateResolvedServerUrl();
  return cached;
}
