import { describe, expect, it } from "vitest";
import type { DataGroupDef } from "@genposter/schema";
import { appendMembersToGroup, registerClonedGroupMembers } from "./dataGroups.js";
import { setProp } from "../../lib/fabric-util.js";

describe("appendMembersToGroup", () => {
  it("adds new member ids without duplicating", () => {
    const groups: DataGroupDef[] = [
      { id: "g1", label: "G", memberIds: ["a"], mode: "slot" },
    ];
    const next = appendMembersToGroup(groups, "g1", ["b", "a"]);
    expect(next[0]!.memberIds).toEqual(["a", "b"]);
  });
});

describe("registerClonedGroupMembers", () => {
  it("registers clones that keep gpDataGroup into memberIds", () => {
    const groups: DataGroupDef[] = [
      { id: "g1", label: "G", memberIds: ["orig"], mode: "slot" },
    ];
    const clone = {
      type: "textbox",
      id: "clone1",
    } as unknown as import("fabric").FabricObject;
    setProp(clone, "id", "clone1");
    setProp(clone, "gpDataGroup", "g1");

    const next = registerClonedGroupMembers(groups, [clone]);
    expect(next[0]!.memberIds).toEqual(["orig", "clone1"]);
  });
});
