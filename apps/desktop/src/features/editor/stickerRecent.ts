const KEY = "genposter.editor.recentStickers";
const MAX = 20;

export function readRecentStickers(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string").slice(0, MAX)
      : [];
  } catch {
    return [];
  }
}

export function pushRecentSticker(dataUrl: string): string[] {
  const prev = readRecentStickers().filter((u) => u !== dataUrl);
  const next = [dataUrl, ...prev].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}
