import type { Slide, SlideItem } from "@genposter/schema";

export interface BindContext {
  slide: Slide;
  item?: SlideItem;
  n?: number;
}

/** Key under which AI-generated text is stashed on an item (per element). */
export function aiKey(elementId: string): string {
  return `__ai__${elementId}`;
}

/** Resolve a text binding token to a string. */
export function resolveText(bind: string, ctx: BindContext, elementId?: string): string {
  if (!bind) return "";
  if (bind.startsWith("static:")) return bind.slice(7);
  if (bind.startsWith("photo:")) return "";
  if (bind.startsWith("ai:")) {
    if (elementId && ctx.item) {
      const v = ctx.item[aiKey(elementId)];
      if (v != null) return String(v);
    }
    return "";
  }
  switch (bind) {
    case "title":
      return ctx.slide.title ?? "";
    case "subtitle":
      return ctx.slide.subtitle ?? "";
    case "page":
      return String(ctx.slide.page ?? ctx.slide.index);
    case "pages":
      return String(ctx.slide.pages ?? 1);
    case "n":
      return String(ctx.n ?? "");
  }
  if (bind.startsWith("item.")) {
    const v = ctx.item?.[bind.slice(5)];
    return v == null ? "" : String(v);
  }
  return "";
}

/** Resolve a photo binding token to an absolute path (or null). */
export function resolvePhoto(bind: string, ctx: BindContext): string | null {
  const m = bind.match(/^photo:(item|slide):(\d+)$/);
  if (!m) return null;
  const idx = parseInt(m[2]!, 10) || 0;
  const arr = m[1] === "item" ? ctx.item?.photos ?? [] : ctx.slide.photos;
  return arr[idx] ?? null;
}

/** Fill {{token}} placeholders (used by AI prompt templates). */
export function fillTokens(tpl: string, ctx: BindContext): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    return resolveText(key, ctx);
  });
}
