/**
 * Minimal HTTP render service for the desktop app.
 *   POST /render   { recipe, templateId, output, slides }  -> { id }
 *   GET  /jobs/:id                                          -> job status
 *   GET  /jobs                                              -> recent jobs
 *   GET  /health
 *
 * Jobs run in-process with a small concurrency pool and are tracked in SQLite.
 */
import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { OUTPUT_DIR, resolveRepo } from "./paths.js";
import { type RenderJobInput, renderSlide, loadTemplate } from "./render.js";
import { JobStore } from "./store.js";

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.env.RENDER_PORT ?? 8777);
const CONCURRENCY = Number(process.env.RENDER_CONCURRENCY ?? 4);

const store = new JobStore();

function send(res: ServerResponse, code: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(code, { "content-type": "application/json", "access-control-allow-origin": "*" });
  res.end(json);
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

async function runJob(id: string, job: RenderJobInput, outDir: string): Promise<void> {
  store.setStatus(id, "running");
  try {
    const template = loadTemplate(job.templateId);
    store.upsertTemplate({ id: template.id, name: template.name, archetype: template.archetype });
    mkdirSync(outDir, { recursive: true });
    const fmt = job.output?.format ?? "jpg";
    const quality = job.output?.quality ?? 90;

    let cursor = 0;
    const slides = job.slides;
    const worker = async () => {
      for (;;) {
        const i = cursor++;
        if (i >= slides.length) break;
        const slide = slides[i]!;
        const canvas = await renderSlide(template, slide);
        const buf =
          fmt === "png" ? await canvas.encode("png") : await canvas.encode("jpeg", quality);
        const name = `${template.id}_${String(slide.index).padStart(2, "0")}.${fmt === "png" ? "png" : "jpg"}`;
        const fp = join(outDir, name);
        writeFileSync(fp, buf);
        store.addItem(id, slide.index, fp);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, slides.length) }, worker));
    store.setStatus(id, "done");
  } catch (err) {
    store.setStatus(id, "error", err instanceof Error ? err.message : String(err));
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    if (req.method === "OPTIONS") return send(res, 204, {});

    if (req.method === "GET" && url.pathname === "/health") {
      return send(res, 200, { ok: true });
    }

    if (req.method === "POST" && url.pathname === "/render") {
      const job = (await readBody(req)) as RenderJobInput;
      if (!job.templateId || !Array.isArray(job.slides)) {
        return send(res, 400, { error: "templateId and slides[] required" });
      }
      const id = randomUUID();
      const date = new Date().toISOString().slice(0, 10);
      const dirRaw = (job.output?.dir ?? OUTPUT_DIR).replace("{date}", date);
      const outDir = resolveRepo(dirRaw);
      store.create({
        id,
        recipe: job.recipe ?? "",
        templateId: job.templateId,
        total: job.slides.length,
        outputDir: outDir,
      });
      void runJob(id, job, outDir);
      return send(res, 202, { id });
    }

    if (req.method === "GET" && url.pathname.startsWith("/jobs/")) {
      const id = url.pathname.split("/")[2]!;
      const job = store.get(id);
      if (!job) return send(res, 404, { error: "not found" });
      return send(res, 200, { ...job, items: store.items(id) });
    }

    if (req.method === "GET" && url.pathname === "/jobs") {
      return send(res, 200, store.list());
    }

    return send(res, 404, { error: "not found" });
  } catch (err) {
    return send(res, 500, { error: err instanceof Error ? err.message : String(err) });
  }
});

server.listen(PORT, () => {
  console.log(`[render] listening on http://127.0.0.1:${PORT} (concurrency ${CONCURRENCY})`);
});
