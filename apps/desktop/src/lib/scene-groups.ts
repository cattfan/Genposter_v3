import type { DataGroupDef, FabricScene } from "@genposter/schema";

/** Migrate legacy gpListRow flags into dataGroups on scene load. */
export function migrateSceneDataGroups(scene: FabricScene): FabricScene {
  const groups = [...((scene.dataGroups as DataGroupDef[] | undefined) ?? [])];
  const objects = scene.objects ?? [];
  const legacyIds = objects
    .filter((o) => o.gpListRow && typeof o.id === "string")
    .map((o) => o.id as string);

  if (legacyIds.length && !groups.some((g) => g.id === "row_legacy")) {
    for (const o of objects) {
      if (o.gpListRow) o.gpDataGroup = "row_legacy";
    }
    groups.push({
      id: "row_legacy",
      label: "Hàng danh sách",
      memberIds: legacyIds,
      mode: "repeat",
      repeat: { rowHeight: 110, gap: 8, maxRows: 7 },
    });
  }

  return { ...scene, dataGroups: groups };
}

export function groupMemberIdSet(groups: DataGroupDef[]): Set<string> {
  return new Set(groups.flatMap((g) => g.memberIds));
}
