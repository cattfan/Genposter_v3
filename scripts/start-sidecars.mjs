/**
 * Start data-api (8756) and render service (8777) as background sidecars.
 * Used by `pnpm dev` and optionally from Tauri setup.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

function spawnProc(label, cmd, args, cwd, env = {}) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, PYTHONIOENCODING: "utf-8", ...env },
    stdio: "inherit",
    shell: isWin,
    detached: !isWin,
  });
  child.on("exit", (code) => {
    if (code && code !== 0) console.error(`[${label}] exited with code ${code}`);
  });
  return child;
}

export function startSidecars() {
  const dataApi = join(ROOT, "services", "data-api");
  const py = isWin ? "python" : "python3";

  console.log("[sidecars] starting data-api on :8756");
  const data = spawnProc(
    "data-api",
    py,
    ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8756"],
    dataApi,
  );

  console.log("[sidecars] starting render on :8777");
  const render = spawnProc(
    "render",
    isWin ? "pnpm.cmd" : "pnpm",
    ["--filter", "@genposter/render", "exec", "tsx", "src/server.ts"],
    ROOT,
  );

  return [data, render];
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` ||
    process.argv[1]?.endsWith("start-sidecars.mjs")) {
  const kids = startSidecars();
  const shutdown = () => {
    for (const k of kids) {
      try {
        if (isWin) spawn("taskkill", ["/pid", String(k.pid), "/f", "/t"], { shell: true });
        else process.kill(-k.pid!, "SIGTERM");
      } catch {
        /* ignore */
      }
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
