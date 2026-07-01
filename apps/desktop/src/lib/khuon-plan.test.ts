import { describe, expect, it } from "vitest";
import type { DataRow, TemplateSet } from "@genposter/schema";
import { buildKhuonPlan, generateSets } from "./khuon-plan.js";

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const set: TemplateSet = {
  id: "s",
  name: "S",
  width: 1000,
  height: 1000,
  pages: [
    {
      id: "p1",
      scene: {
        objects: [{ id: "a", gpDataGroup: "g_slot" }],
        dataGroups: [{ id: "g_slot", label: "Slot", memberIds: ["a"], mode: "slot" }],
      },
    },
    {
      id: "p2",
      scene: {
        objects: [{ id: "b", gpDataGroup: "g_rep" }],
        dataGroups: [
          {
            id: "g_rep",
            label: "Lặp",
            memberIds: ["b"],
            mode: "repeat",
            repeat: { rowHeight: 100, gap: 0, maxRows: 5 },
          },
        ],
      },
    },
  ],
};

const rows: DataRow[] = Array.from({ length: 20 }, (_, i) => ({
  name: `q${i}`,
  photos: [],
}));

describe("buildKhuonPlan", () => {
  it("sums slots across pages (1 slot + 5 repeat = 6)", () => {
    expect(buildKhuonPlan(set).rowsNeededPerSet).toBe(6);
  });
});

describe("generateSets", () => {
  it("creates the requested number of sets", () => {
    const out = generateSets(buildKhuonPlan(set), rows, 3, 0, mulberry32(1));
    expect(out).toHaveLength(3);
    expect(out[0]!.setIndex).toBe(1);
  });
  it("no data row repeats within one set", () => {
    const out = generateSets(buildKhuonPlan(set), rows, 1, 0, mulberry32(2));
    const used = out[0]!.pages.flatMap((p) => p.groups.flatMap((g) => g.rows.map((r) => r.name)));
    expect(used).toHaveLength(6);
    expect(new Set(used).size).toBe(6);
  });
  it("assigns 1 row to slot group and maxRows to repeat group", () => {
    const out = generateSets(buildKhuonPlan(set), rows, 1, 0, mulberry32(3));
    const p1 = out[0]!.pages.find((p) => p.pageId === "p1")!;
    const p2 = out[0]!.pages.find((p) => p.pageId === "p2")!;
    expect(p1.groups[0]!.rows).toHaveLength(1);
    expect(p2.groups[0]!.rows).toHaveLength(5);
  });
});
