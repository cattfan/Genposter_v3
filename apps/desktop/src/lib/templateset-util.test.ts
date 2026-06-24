import { describe, expect, it } from "vitest";
import {
  makePageRef,
  parsePageRef,
  nextUntitledName,
  normalizeSet,
} from "./templateset-util.js";

describe("page ref", () => {
  it("round-trips set/page", () => {
    expect(parsePageRef(makePageRef("mau1", "p2"))).toEqual({
      setId: "mau1",
      pageId: "p2",
    });
  });
  it("legacy ref without separator yields null pageId", () => {
    expect(parsePageRef("oldid")).toEqual({ setId: "oldid", pageId: null });
  });
});

describe("nextUntitledName", () => {
  it("starts at 1", () => {
    expect(nextUntitledName([])).toBe("Mẫu mới (1)");
  });
  it("skips taken numbers", () => {
    expect(nextUntitledName(["Mẫu mới (1)", "Mẫu mới (2)"])).toBe("Mẫu mới (3)");
  });
  it("fills the smallest free gap", () => {
    expect(nextUntitledName(["Mẫu mới (1)", "Mẫu mới (3)"])).toBe("Mẫu mới (2)");
  });
});

describe("normalizeSet", () => {
  it("wraps a legacy single-scene template into one page", () => {
    const set = normalizeSet(
      { id: "a", name: "A", width: 1080, height: 1350, scene: { objects: [] } },
      "a",
    );
    expect(set.pages).toHaveLength(1);
    expect(set.pages[0]!.id).toBe("p1");
    expect(set.width).toBe(1080);
  });
  it("keeps an existing multi-page set", () => {
    const set = normalizeSet(
      {
        id: "b",
        name: "B",
        width: 1588,
        height: 2248,
        pages: [
          { id: "x", scene: { objects: [] } },
          { id: "y", scene: { objects: [] } },
        ],
      },
      "b",
    );
    expect(set.pages.map((p) => p.id)).toEqual(["x", "y"]);
  });
  it("falls back to defaults + fallbackId when fields missing", () => {
    const set = normalizeSet({ scene: { objects: [] } }, "fallback");
    expect(set.id).toBe("fallback");
    expect(set.width).toBe(1588);
    expect(set.height).toBe(2248);
  });
});
