import type { DataGroupDef } from "@genposter/schema";

import { getId, getStr, setProp } from "../../lib/fabric-util.js";
import { slugify } from "../../lib/paths.js";
import { migrateSceneDataGroups } from "../../lib/scene-groups.js";
import type * as fabric from "fabric";

export { migrateSceneDataGroups };

export function syncGroupMembers(
  groups: DataGroupDef[],
  canvas: fabric.Canvas,
): DataGroupDef[] {
  const byId = new Map(canvas.getObjects().map((o) => [getId(o), o]));
  return groups
    .map((g) => ({
      ...g,
      memberIds: g.memberIds.filter((id) => byId.has(id)),
    }))
    .filter((g) => g.memberIds.length > 0);
}

export function removeMemberFromGroups(
  groups: DataGroupDef[],
  memberId: string,
): DataGroupDef[] {
  return groups
    .map((g) => ({
      ...g,
      memberIds: g.memberIds.filter((id) => id !== memberId),
    }))
    .filter((g) => g.memberIds.length > 0);
}

export function newGroupId(label: string): string {
  const base = slugify(label) || "group";
  return `${base}_${Date.now().toString(36)}`;
}

export function createDataGroupDef(
  label: string,
  memberIds: string[],
  mode: DataGroupDef["mode"] = "slot",
): DataGroupDef {
  return {
    id: newGroupId(label),
    label,
    memberIds,
    mode,
    itemIndex: 0,
    repeat: mode === "repeat" ? { rowHeight: 110, gap: 8, maxRows: 7 } : undefined,
  };
}

export function assignObjectsToGroup(
  objects: fabric.FabricObject[],
  groupId: string,
): void {
  for (const o of objects) setProp(o, "gpDataGroup", groupId);
}

export function clearObjectGroup(obj: fabric.FabricObject): void {
  setProp(obj, "gpDataGroup", "");
}

export function getObjectGroupId(obj: fabric.FabricObject): string {
  return getStr(obj, "gpDataGroup") ?? "";
}

export function findGroup(
  groups: DataGroupDef[],
  groupId: string,
): DataGroupDef | undefined {
  return groups.find((g) => g.id === groupId);
}

export function updateGroup(
  groups: DataGroupDef[],
  groupId: string,
  patch: Partial<DataGroupDef>,
): DataGroupDef[] {
  return groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g));
}
