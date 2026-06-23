import { readFileSync } from "node:fs";

import { resolveRepo } from "./paths.js";
import { type RenderJobInput, renderJob } from "./render.js";

interface ParsedArgs {
  _: string[];
  [key: string]: string | boolean | string[];
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] ?? "render";

  if (cmd !== "render") {
    console.error(`Unknown command: ${cmd}`);
    console.error("Usage: cli render --job <job.json> [--template <id|path.json>] [--outdir <dir>] [--format jpg|png] [--quality 90]");
    process.exit(1);
  }

  const jobPath = typeof args.job === "string" ? args.job : "";
  if (!jobPath) {
    console.error("--job <path> is required");
    process.exit(1);
  }

  const job = JSON.parse(readFileSync(resolveRepo(jobPath), "utf-8")) as RenderJobInput;
  let templatePath: string | undefined;
  if (typeof args.template === "string") {
    if (args.template.endsWith(".json")) templatePath = args.template;
    else job.templateId = args.template;
  }
  if (typeof args.format === "string") {
    job.output = { ...job.output, format: args.format as "jpg" | "png" };
  }
  if (typeof args.quality === "string") {
    job.output = { ...job.output, quality: parseInt(args.quality, 10) };
  }

  const t0 = Date.now();
  const files = await renderJob(job, {
    templatePath,
    outDir: typeof args.outdir === "string" ? args.outdir : undefined,
    onProgress: (done, total, file) => console.log(`  [${done}/${total}] ${file}`),
  });
  console.log(`Rendered ${files.length} image(s) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
