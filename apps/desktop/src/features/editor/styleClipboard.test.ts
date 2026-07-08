import { describe, expect, it, beforeEach } from "vitest";

import {
  clearStyleClipboard,
  copyStyleFrom,
  hasStoredStyle,
  pasteStyleTo,
  resolveStyleTarget,
  styleKind,
} from "./styleClipboard.js";

function mockObj(type: string, props: Record<string, unknown> = {}) {
  return { type, ...props } as import("fabric").FabricObject;
}

describe("styleClipboard", () => {
  beforeEach(() => clearStyleClipboard());
  it("recognizes path and group objects as shapes", () => {
    expect(styleKind(mockObj("path", { fill: "#f00" }))).toBe("shape");
    const icon = mockObj("group", {
      getObjects: () => [mockObj("path", { fill: "#00f", stroke: "#000", strokeWidth: 2 })],
    });
    expect(styleKind(icon)).toBe("shape");
  });

  it("copies fill/stroke from grouped icon paths", () => {
    const icon = mockObj("group", {
      getObjects: () => [mockObj("path", { fill: "#00f", stroke: "#000", strokeWidth: 2 })],
    });
    expect(copyStyleFrom(icon)).toBe(true);
    expect(hasStoredStyle()).toBe(true);

    const rect = mockObj("rect", { fill: "#fff" });
    const patch = pasteStyleTo(rect);
    expect(patch).toMatchObject({ fill: "#00f", stroke: "#000", strokeWidth: 2 });
  });

  it("resolves activeSelection to first object", () => {
    const rect = mockObj("rect", { fill: "#abc", opacity: 0.5, angle: 12 });
    const sel = mockObj("activeSelection", {
      getObjects: () => [rect],
    });
    expect(resolveStyleTarget(sel)).toBe(rect);
    expect(copyStyleFrom(sel)).toBe(true);
    expect(pasteStyleTo(mockObj("rect", { fill: "#000" }))).toMatchObject({
      fill: "#abc",
      opacity: 0.5,
      angle: 12,
    });
  });

  it("rejects copy when no appearance props are readable", () => {
    expect(copyStyleFrom(mockObj("rect"))).toBe(false);
    expect(hasStoredStyle()).toBe(false);
  });
});
