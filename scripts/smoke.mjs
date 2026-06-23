// End-to-end smoke test: recipe -> data-api build -> render -> verify JPGs.
// Usage: pnpm smoke [recipeFileName]
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const recipeFile = process.argv[2] ?? "todo_list_an_toi.yaml";
const recipeRel = `recipes/${recipeFile}`;
const slidesRel = `output/_slides/${recipeFile.replace(/\.ya?ml$/, "")}.json`;

function run(label, cmd, opts = {}) {
  console.log(`\n=== ${label} ===\n$ ${cmd}`);
  const r = spawnSync(cmd, { shell: true, stdio: "inherit", ...opts });
  if (r.status !== 0) {
    console.error(`\n[smoke] step failed: ${label}`);
    process.exit(r.status ?? 1);
  }
}

mkdirSync(join(ROOT, "output", "_slides"), { recursive: true });

// 1) Build slide payload from the recipe (Python, no server).
run(
  "build slides (data-api)",
  `python -m app.cli build --recipe "${join(ROOT, recipeRel)}" --out "${join(ROOT, slidesRel)}"`,
  { cwd: join(ROOT, "services", "data-api"), env: { ...process.env, PYTHONIOENCODING: "utf-8" } },
);

// 2) Render slides to images (Node).
run(
  "render slides",
  `pnpm --filter @genposter/render exec tsx src/cli.ts render --job "${join(ROOT, slidesRel)}"`,
  { cwd: ROOT },
);

// 3) Verify output.
const outDir = join(ROOT, "output", "to_do_list");
const imgs = existsSync(outDir)
  ? readdirSync(outDir).filter((f) => /\.(jpg|png)$/i.test(f))
  : [];
console.log(`\n=== verify ===`);
console.log(`output dir: ${outDir}`);
console.log(`images:     ${imgs.length}`);
for (const f of imgs) console.log(`  - ${f}`);

if (imgs.length === 0) {
  console.error("\n[smoke] FAILED: no images produced");
  process.exit(1);
}
console.log("\n[smoke] OK");
