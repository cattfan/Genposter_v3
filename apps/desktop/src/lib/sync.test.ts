import { describe, expect, it, vi } from "vitest";
import type { CacheIndex, CachedRow } from "./sync.js";
import { buildSyncPlans, restoreMissingSheetCache } from "./sync.js";

vi.mock("./server-api.js", () => ({
  listAllRecords: vi.fn(async () => []),
  fetchAttachment: vi.fn(),
  listServerTables: vi.fn(),
}));

describe("buildSyncPlans", () => {
  it("reports sheets with no server table as missing", async () => {
    const result = await buildSyncPlans(
      ["sheet_a", "sheet_b"],
      new Map([["sheet_a", "table-1"]]),
      "dalat",
      new Map(),
    );
    expect(result.missingSheets).toEqual(["sheet_b"]);
    expect(result.plans.map((p) => p.sheet)).toEqual(["sheet_a"]);
  });
});

describe("restoreMissingSheetCache", () => {
  const cachedRow: CachedRow = {
    id: 1,
    updatedAt: "",
    fields: { name: "Quán cũ" },
    photos: [],
    sig: "s",
  };

  it("keeps old rows for missing sheets", () => {
    const old: CacheIndex = {
      province: "dalat",
      syncedAt: "2026-01-01",
      sheets: {
        missing_sheet: { rows: [cachedRow] },
      },
    };
    const index: CacheIndex = {
      province: "dalat",
      syncedAt: "2026-01-02",
      sheets: {
        ok_sheet: { rows: [] },
      },
    };

    restoreMissingSheetCache(index, old, ["missing_sheet"]);

    expect(index.sheets.missing_sheet).toEqual(old.sheets.missing_sheet);
    expect(index.sheets.ok_sheet).toEqual({ rows: [] });
  });

  it("ignores missing sheets that were never cached", () => {
    const index: CacheIndex = {
      province: "dalat",
      syncedAt: "2026-01-02",
      sheets: {},
    };

    restoreMissingSheetCache(index, null, ["never_cached"]);

    expect(index.sheets).toEqual({});
  });
});
