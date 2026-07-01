import { describe, expect, it } from "vitest";
import type { DataRow } from "@genposter/schema";
import { resolvePhoto, resolveText } from "./bind.js";

const row: DataRow = { name: "Quán A", price: "50k", photos: ["/a.jpg", "/b.jpg"] };

describe("resolveText", () => {
  it("static returns literal", () => {
    expect(resolveText("static:Xin chào", {})).toBe("Xin chào");
  });
  it("item.field reads the row", () => {
    expect(resolveText("item.name", { row })).toBe("Quán A");
  });
  it("missing field is empty", () => {
    expect(resolveText("item.zzz", { row })).toBe("");
  });
  it("n reads ordinal", () => {
    expect(resolveText("n", { n: 3 })).toBe("3");
  });
  it("photo token resolves to empty text", () => {
    expect(resolveText("photo:item:0", { row })).toBe("");
  });
});

describe("resolvePhoto", () => {
  it("photo:item:i reads row photos", () => {
    expect(resolvePhoto("photo:item:1", { row })).toBe("/b.jpg");
  });
  it("photo:set:i reads set photos", () => {
    expect(resolvePhoto("photo:set:0", { setPhotos: ["/s.jpg"] })).toBe("/s.jpg");
  });
  it("out of range is null", () => {
    expect(resolvePhoto("photo:item:9", { row })).toBeNull();
  });
});
