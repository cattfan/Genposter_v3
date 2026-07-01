import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import { makeZip, timestampZipName } from "./zip.js";

describe("timestampZipName", () => {
  it("formats Genposter_YYYY-MM-DD_HH-MM.zip with no colons", () => {
    const name = timestampZipName(new Date(2026, 6, 1, 9, 5));
    expect(name).toBe("Genposter_2026-07-01_09-05.zip");
    expect(name).not.toContain(":");
  });
});

describe("makeZip", () => {
  it("round-trips files by path", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([9, 8]);
    const zipped = makeZip({ "bo01/anh01.jpg": a, "bo01/anh02.jpg": b });
    const back = unzipSync(zipped);
    expect(Array.from(back["bo01/anh01.jpg"]!)).toEqual([1, 2, 3]);
    expect(Array.from(back["bo01/anh02.jpg"]!)).toEqual([9, 8]);
  });
});
