import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, searchForWorkspaceRoot } from "vite";

const schemaSrc = fileURLToPath(
  new URL("../../packages/schema/src/index.ts", import.meta.url),
);
const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

const IMAGE_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function mimeForFile(file: string): string {
  const ext = path.extname(file).slice(1).toLowerCase();
  return IMAGE_MIME[ext] ?? "application/octet-stream";
}

type MiddlewareReq = { method?: string; url?: string; on: Function };
type MiddlewareRes = {
  statusCode: number;
  setHeader: (k: string, v: string) => void;
  end: (b?: string | Buffer) => void;
};

function resolveRel(rel: string): string | null {
  if (!rel || rel.includes("..")) return null;
  const file = path.resolve(repoRoot, rel);
  if (!file.startsWith(repoRoot)) return null;
  return file;
}

function readBody(req: MiddlewareReq): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** Read/write project files under /dev-fs/ when running Vite without the Tauri shell. */
function devFsPlugin() {
  return {
    name: "genposter-dev-fs",
    configureServer(server: { middlewares: { use: Function } }) {
      server.middlewares.use(
        "/dev-fs",
        async (req: MiddlewareReq, res: MiddlewareRes, next: () => void) => {
          try {
            let rel = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
            if (rel.startsWith("/")) rel = rel.slice(1);
            const method = req.method ?? "GET";

            if (rel.startsWith("__mkdir/") && method === "POST") {
              const dirRel = rel.slice("__mkdir/".length);
              const dir = resolveRel(dirRel);
              if (!dir) {
                res.statusCode = 403;
                res.end("Forbidden");
                return;
              }
              fs.mkdirSync(dir, { recursive: true });
              res.statusCode = 204;
              res.end();
              return;
            }

            if (rel.startsWith("__rename/") && method === "POST") {
              const fromRel = rel.slice("__rename/".length);
              const toRel =
                new URLSearchParams((req.url ?? "").split("?")[1] ?? "").get("to") ?? "";
              const from = resolveRel(fromRel);
              const to = resolveRel(toRel);
              if (!from || !to) {
                res.statusCode = 403;
                res.end("Forbidden");
                return;
              }
              try {
                fs.mkdirSync(path.dirname(to), { recursive: true });
                fs.renameSync(from, to);
              } catch {
                res.statusCode = 404;
                res.end("Rename failed");
                return;
              }
              res.statusCode = 204;
              res.end();
              return;
            }

            if (rel.startsWith("__dir/") && method === "GET") {
              const dirRel = rel.slice("__dir/".length);
              const dir = resolveRel(dirRel);
              if (!dir) {
                res.statusCode = 403;
                res.end("Forbidden");
                return;
              }
              let entries: fs.Dirent[];
              try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
              } catch {
                res.statusCode = 404;
                res.end("Not found");
                return;
              }
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify(
                  entries.map((e) => ({
                    name: e.name,
                    isDirectory: e.isDirectory(),
                    isFile: e.isFile(),
                  })),
                ),
              );
              return;
            }

            const file = resolveRel(rel);
            if (!file) {
              res.statusCode = 403;
              res.end("Forbidden");
              return;
            }

            if (method === "PUT") {
              const body = await readBody(req);
              fs.mkdirSync(path.dirname(file), { recursive: true });
              fs.writeFileSync(file, body);
              res.statusCode = 204;
              res.end();
              return;
            }

            if (method === "DELETE") {
              const recursive = (req.url ?? "").includes("recursive=1");
              try {
                fs.rmSync(file, { recursive, force: true });
              } catch {
                res.statusCode = 404;
                res.end("Not found");
                return;
              }
              res.statusCode = 204;
              res.end();
              return;
            }

            if (method !== "GET" && method !== "HEAD") return next();

            fs.stat(file, (err, stat) => {
              if (err) {
                res.statusCode = 404;
                res.end("Not found");
                return;
              }
              // HEAD doubles as the exists() check and must work for
              // directories too (e.g. templates/ before listing it).
              if (method === "HEAD") {
                res.statusCode = stat.isFile() || stat.isDirectory() ? 200 : 404;
                res.end();
                return;
              }
              if (!stat.isFile()) {
                res.statusCode = 404;
                res.end("Not found");
                return;
              }
              res.setHeader("Content-Type", mimeForFile(file));
              fs.readFile(file, (readErr, data) => {
                if (readErr) {
                  res.statusCode = 500;
                  res.end("Read error");
                  return;
                }
                res.end(data);
              });
            });
          } catch {
            res.statusCode = 500;
            res.end("Dev FS error");
          }
        },
      );
    },
  };
}

// Tauri expects a fixed dev port and a built dist/ for production.
export default defineConfig({
  plugins: [react(), devFsPlugin()],
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
