import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { REPO_ROOT, TEMPLATES_DIR } from "./paths.js";

const ROOT = REPO_ROOT;
const TEMPLATES = TEMPLATES_DIR;

/** List template JSON files in templates/. */
export function listTemplates(): { id: string; name?: string; archetype?: string }[] {
  if (!existsSync(TEMPLATES)) return [];
  return readdirSync(TEMPLATES)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        const j = JSON.parse(readFileSync(join(TEMPLATES, f), "utf-8")) as {
          id?: string;
          name?: string;
          archetype?: string;
        };
        return { id: j.id ?? f.replace(/\.json$/, ""), name: j.name, archetype: j.archetype };
      } catch {
        return { id: f.replace(/\.json$/, "") };
      }
    });
}

export function loadTemplateFile(id: string): unknown {
  const file = join(TEMPLATES, `${id}.json`);
  if (!existsSync(file)) throw new Error(`template not found: ${id}`);
  return JSON.parse(readFileSync(file, "utf-8"));
}

export function saveTemplateFile(id: string, body: unknown): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const file = join(TEMPLATES, `${safe}.json`);
  writeFileSync(file, JSON.stringify(body, null, 2), "utf-8");
  return file;
}

export { ROOT, DATA };
