/** Replace {{ token }} / {{ a.b.c }} in a string from a context object. */
export function bindText(text: string, ctx: Record<string, unknown>): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const v = getPath(ctx, key);
    return v == null ? "" : String(v);
  });
}

export function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => {
    if (o == null) return undefined;
    return (o as Record<string, unknown>)[k];
  }, obj);
}
