/** Vietnamese-aware text normalization helpers. */

export function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/** Lowercase, drop diacritics and non-alphanumerics (for fuzzy matching). */
export function norm(s: unknown): string {
  return stripDiacritics(String(s ?? "")).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function normCompare(a: unknown, b: unknown): boolean {
  return norm(a) === norm(b);
}
