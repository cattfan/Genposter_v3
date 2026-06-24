import { describe, expect, it } from "vitest";
import {
  FONT_CATALOG,
  fontFamilyGroups,
  uniqueFamilies,
} from "./font-catalog.js";

describe("font-catalog", () => {
  it("has at least 40 unique families", () => {
    expect(uniqueFamilies().length).toBeGreaterThanOrEqual(40);
  });

  it("every entry has tier A B or C", () => {
    for (const e of FONT_CATALOG) {
      expect(["A", "B", "C"]).toContain(e.tier);
    }
  });

  it("groups are non-empty strings", () => {
    const groups = fontFamilyGroups();
    expect(groups.length).toBeGreaterThan(3);
    for (const g of groups) {
      expect(g.families.length).toBeGreaterThan(0);
    }
  });
});
