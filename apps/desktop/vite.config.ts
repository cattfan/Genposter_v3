import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Tauri expects a fixed dev port and the dist output for the production build.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  optimizeDeps: {
    include: ["polotno", "mobx", "mobx-react-lite", "@blueprintjs/core"],
  },
  build: {
    outDir: "dist",
    target: "es2022",
    chunkSizeWarningLimit: 4000,
  },
});
