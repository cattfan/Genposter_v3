import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, searchForWorkspaceRoot } from "vite";

const schemaSrc = fileURLToPath(
  new URL("../../packages/schema/src/index.ts", import.meta.url),
);

// Tauri expects a fixed dev port and a built dist/ for production.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  resolve: {
    alias: {
      // Import the schema package straight from source so Vite transpiles its TS.
      "@genposter/schema": schemaSrc,
    },
  },
  optimizeDeps: {
    exclude: ["@genposter/schema"],
    include: ["fabric", "xlsx", "js-yaml"],
  },
  server: {
    port: 1420,
    strictPort: true,
    host: "127.0.0.1",
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())],
    },
  },
  build: {
    outDir: "dist",
    target: "es2022",
    chunkSizeWarningLimit: 4000,
  },
});
