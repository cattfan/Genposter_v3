/** Persisted app settings (project root + AI config), stored in localStorage. */

export interface AiSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface AppSettings {
  /** Absolute path to the Genposter project root (contains data/, templates/, ...). */
  rootDir: string;
  ai: AiSettings;
}

const KEY = "genposter.settings.v1";

const DEFAULTS: AppSettings = {
  rootDir: "C:/Users/cattfan/Desktop/Genposter_V3",
  ai: {
    baseUrl: import.meta.env.VITE_AI_BASE_URL ?? "https://api.openai.com/v1",
    apiKey: import.meta.env.VITE_AI_API_KEY ?? "",
    model: import.meta.env.VITE_AI_MODEL ?? "gpt-4o-mini",
  },
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      rootDir: parsed.rootDir || DEFAULTS.rootDir,
      ai: { ...DEFAULTS.ai, ...(parsed.ai ?? {}) },
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

export function refreshSettings(): AppSettings {
  cached = loadSettings();
  return cached;
}
