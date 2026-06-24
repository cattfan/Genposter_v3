import type { GenposterTemplate } from "@genposter/schema";

import { listTemplateSets, loadTemplateSet } from "./templateset-io.js";
import { makePageRef, parsePageRef } from "./templateset-util.js";

/** A flattened page entry the Produce tab can pick + render. id = "<setId>::<pageId>". */
export interface TemplateSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  updatedAt?: string;
}

export async function listTemplates(): Promise<TemplateSummary[]> {
  const sets = await listTemplateSets();
  const out: TemplateSummary[] = [];
  for (const s of sets) {
    const n = s.pages.length;
    s.pages.forEach((p, k) => {
      out.push({
        id: makePageRef(s.id, p.id),
        name: `${s.name} · ${p.name ?? `Trang ${k + 1}`} (${k + 1}/${n})`,
        width: s.width,
        height: s.height,
        updatedAt: s.updatedAt,
      });
    });
  }
  return out;
}

export async function loadTemplate(ref: string): Promise<GenposterTemplate> {
  const { setId, pageId } = parsePageRef(ref);
  const set = await loadTemplateSet(setId);
  const page = (pageId ? set.pages.find((p) => p.id === pageId) : null) ?? set.pages[0]!;
  return {
    id: ref,
    name: set.name,
    width: set.width,
    height: set.height,
    scene: page.scene,
  };
}
