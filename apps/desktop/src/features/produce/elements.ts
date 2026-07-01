import type { DataGroupDef, FabricScene, TemplateSet } from "@genposter/schema";

import { migrateSceneDataGroups } from "../../lib/scene-groups.js";

export interface ElementInfo {
  id: string;
  type: string;
  label: string;
  bindHint: string;
  dataGroupId: string;
  isImage: boolean;
}

export interface PageElements {
  pageId: string;
  name: string;
  elements: ElementInfo[];
  dataGroups: DataGroupDef[];
}

/** Pull bindable objects (those with a stable id) out of a single scene. */
export function extractElements(scene: FabricScene | undefined): ElementInfo[] {
  const objs = (scene?.objects ?? []) as Record<string, unknown>[];
  const out: ElementInfo[] = [];
  for (const o of objs) {
    const id = typeof o.id === "string" ? o.id : "";
    if (!id) continue;
    const type = typeof o.type === "string" ? o.type : "obj";
    out.push({
      id,
      type,
      label: (o.gpLabel as string) || type,
      bindHint: (o.gpBind as string) || "",
      dataGroupId: (o.gpDataGroup as string) || "",
      isImage: type === "image",
    });
  }
  return out;
}

/** Per-page elements + data groups for the whole khuôn (migrated scenes). */
export function extractSetPages(set: TemplateSet): PageElements[] {
  return set.pages.map((p, i) => {
    const scene = migrateSceneDataGroups(p.scene);
    return {
      pageId: p.id,
      name: p.name ?? `Trang ${i + 1}`,
      elements: extractElements(scene),
      dataGroups: (scene.dataGroups as DataGroupDef[] | undefined) ?? [],
    };
  });
}

export function allElements(pages: PageElements[]): ElementInfo[] {
  return pages.flatMap((p) => p.elements);
}
