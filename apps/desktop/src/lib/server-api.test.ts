import { describe, expect, it } from "vitest";
import { connectionVia } from "./server-api.js";
import type { ServerSettings } from "./settings.js";

const base: ServerSettings = {
  url: "http://localhost:8080",
  lanUrl: "http://localhost:8080",
  token: "t",
  baseId: "b",
  province: "dalat",
};

describe("connectionVia", () => {
  it("labels localhost as local when url and lanUrl both default to Local Docker", () => {
    expect(connectionVia("http://localhost:8080", base)).toBe("local");
    expect(connectionVia("http://127.0.0.1:8080", base)).toBe("local");
  });

  it("labels distinct LAN fallback as lan", () => {
    const s: ServerSettings = {
      ...base,
      url: "http://100.74.131.110:8080",
      lanUrl: "http://192.168.110.101:8080",
    };
    expect(connectionVia("http://192.168.110.101:8080", s)).toBe("lan");
    expect(connectionVia("http://100.74.131.110:8080", s)).toBe("tailscale");
  });
});
