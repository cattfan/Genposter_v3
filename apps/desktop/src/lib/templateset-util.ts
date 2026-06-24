import {
  DEFAULT_TEMPLATE_H,
  DEFAULT_TEMPLATE_W,
  type FabricScene,
  type TemplatePage,
  type TemplateSet,
} from "@genposter/schema";

const SEP = "::";

export function makePageRef(setId: string, pageId: string): string {
  return `${setId}${SEP}${pageId}`;
}

export function parsePageRef(ref: string): { setId: string; pageId: string | null } {
  const i = ref.indexOf(SEP);
  if (i < 0) return { setId: ref, pageId: null };
  return { setId: ref.slice(0, i), pageId: ref.slice(i + SEP.length) };
}

export function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(
    Math.random() * 1e6,
  ).toString(36)}`;
}

export function emptyScene(): FabricScene {
  return { version: "6.0.0", objects: [] };
}

export function emptyPage(name?: string): TemplatePage {
  return { id: genId("page"), name, scene: emptyScene() };
}

export function nextUntitledName(existing: string[]): string {
  const taken = new Set(existing.map((s) => s.trim()));
  let n = 1;
  while (taken.has(`Mẫu mới (${n})`)) n++;
  return `Mẫu mới (${n})`;
}

export function normalizeSet(raw: unknown, fallbackId: string): TemplateSet {
  const o = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);
  const str = (v: unknown, d: string) => (typeof v === "string" ? v : d);

  if (Array.isArray(o.pages)) {
    const pages = (o.pages as Record<string, unknown>[]).map((p, i) => ({
      id: str(p?.id, `p${i + 1}`),
      name: typeof p?.name === "string" ? (p.name as string) : undefined,
      scene: (p?.scene as FabricScene) ?? emptyScene(),
      thumbnail:
        typeof p?.thumbnail === "string" ? (p.thumbnail as string) : undefined,
    }));
    return {
      id: str(o.id, fallbackId),
      name: str(o.name, fallbackId),
      width: num(o.width, DEFAULT_TEMPLATE_W),
      height: num(o.height, DEFAULT_TEMPLATE_H),
      pages: pages.length ? pages : [{ id: "p1", scene: emptyScene() }],
      createdAt: typeof o.createdAt === "string" ? o.createdAt : undefined,
      updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : undefined,
    };
  }

  return {
    id: str(o.id, fallbackId),
    name: str(o.name, fallbackId),
    width: num(o.width, DEFAULT_TEMPLATE_W),
    height: num(o.height, DEFAULT_TEMPLATE_H),
    pages: [
      {
        id: "p1",
        scene: (o.scene as FabricScene) ?? emptyScene(),
        thumbnail:
          typeof o.thumbnail === "string" ? (o.thumbnail as string) : undefined,
      },
    ],
    createdAt: typeof o.createdAt === "string" ? o.createdAt : undefined,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : undefined,
  };
}
