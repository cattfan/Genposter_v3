import type { DataRow } from "@genposter/schema";

export interface BindContext {
  /** The data row assigned to the current group member (if any). */
  row?: DataRow;
  /** Set-level photos (token photo:set:i). */
  setPhotos?: string[];
  /** 1-based ordinal within a repeat group. */
  n?: number;
}

/** Key under which AI-generated text is stashed on a row (per element). */
export function aiKey(elementId: string): string {
  return `__ai__${elementId}`;
}

/** Resolve a text binding token to a string. */
export function resolveText(bind: string, ctx: BindContext, elementId?: string): string {
  if (!bind) return "";
  if (bind.startsWith("static:")) return bind.slice(7);
  if (bind.startsWith("photo:")) return "";
  if (bind.startsWith("ai:")) {
    if (elementId && ctx.row) {
      const v = ctx.row[aiKey(elementId)];
      if (v != null) return String(v);
    }
    return "";
  }
  if (bind === "n") return String(ctx.n ?? "");
  if (bind.startsWith("item.")) {
    const v = ctx.row?.[bind.slice(5)];
    return v == null ? "" : String(v);
  }
  return "";
}

/** Resolve a photo binding token to an absolute path (or null). */
export function resolvePhoto(bind: string, ctx: BindContext): string | null {
  const m = bind.match(/^photo:(item|set):(\d+)$/);
  if (!m) return null;
  const idx = parseInt(m[2]!, 10) || 0;
  const arr = m[1] === "item" ? ctx.row?.photos ?? [] : ctx.setPhotos ?? [];
  return arr[idx] ?? null;
}

/** Fill {{token}} placeholders (used by AI prompt templates). */
export function fillTokens(tpl: string, ctx: BindContext): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    return resolveText(key, ctx);
  });
}
