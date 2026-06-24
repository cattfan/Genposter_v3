import type { DataGroupDef, FabricScene } from "@genposter/schema";

export interface ElementInfo {
  id: string;
  type: string;
  label: string;
  bindHint: string;
  listRow: boolean;
  dataGroupId: string;
  isImage: boolean;
}

/** Pull bindable objects (those with a stable id) out of a template scene. */
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
      listRow: Boolean(o.gpListRow),
      dataGroupId: (o.gpDataGroup as string) || "",
      isImage: type === "image",
    });
  }
  return out;
}

export function extractDataGroups(scene: FabricScene | undefined): DataGroupDef[] {
  return (scene?.dataGroups as DataGroupDef[] | undefined) ?? [];
}
