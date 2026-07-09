import { describe, expect, it } from "vitest";
import type { DataRow } from "@genposter/schema";
import { pickSetRows } from "./dataPreview.js";

const rows: DataRow[] = Array.from({ length: 10 }, (_, i) => ({
  name: `row-${i}`,
  photos: [],
}));

describe("pickSetRows", () => {
  it("returns distinct rows without wrap-around", () => {
    const picked = pickSetRows(rows, 8, 6);
    expect(picked).toHaveLength(6);
    expect(picked.map((r) => r.name)).toEqual([
      "row-4",
      "row-5",
      "row-6",
      "row-7",
      "row-8",
      "row-9",
    ]);
    expect(new Set(picked.map((r) => r.name)).size).toBe(6);
  });

  it("clamps start when near the end instead of wrapping", () => {
    const picked = pickSetRows(rows, 99, 4);
    expect(picked.map((r) => r.name)).toEqual(["row-6", "row-7", "row-8", "row-9"]);
  });

  it("returns empty when count is zero", () => {
    expect(pickSetRows(rows, 0, 0)).toEqual([]);
  });
});
