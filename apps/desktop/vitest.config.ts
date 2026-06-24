import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const schemaSrc = fileURLToPath(
  new URL("../../packages/schema/src/index.ts", import.meta.url),
);

export default defineConfig({
  resolve: { alias: { "@genposter/schema": schemaSrc } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
