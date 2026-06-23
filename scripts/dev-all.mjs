/**
 * Dev entry: sidecars (data-api + render) then Tauri desktop app.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { startSidecars } from "./start-sidecars.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

const sidecars = startSidecars();

// Give Python/Node a moment to bind ports before Vite/Tauri starts.
await new Promise((r) => setTimeout(r, 2500));

console.log("[dev] launching Tauri…");
const tauri = spawn(
  isWin ? "pnpm.cmd" : "pnpm",
  ["--filter", "@genposter/desktop", "tauri", "dev"],
  { cwd: ROOT, stdio: "inherit", shell: isWin },
);

function shutdown() {
  try {
    tauri.kill();
  } catch {
    /* ignore */
  }
  for (const k of sidecars) {
    try {
      if (isWin) spawn("taskkill", ["/pid", String(k.pid), "/f", "/t"], { shell: true });
      else k.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
tauri.on("exit", (code) => {
  shutdown();
  process.exit(code ?? 0);
});
