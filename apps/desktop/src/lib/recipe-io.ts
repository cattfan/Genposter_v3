import yaml from "js-yaml";
import { DEFAULT_CAPTION_PROMPT, type Recipe } from "@genposter/schema";

import { ensureDir, exists, readDir, readText, remove, writeText } from "./fsx.js";
import { join, paths, slugify } from "./paths.js";

export interface RecipeSummary {
  id: string;
  name: string;
  templateId: string;
  sheet: string;
}

/** YAML on-disk shape (snake_case, human friendly). */
interface RecipeYaml {
  name?: string;
  template_id?: string;
  data?: {
    sheet?: string;
    filter?: Record<string, string>;
    limit?: number | null;
  };
  photos?: { per_item?: number; per_set?: number };
  random_set_count?: number;
  bindings?: { elementId: string; bind: string; label?: string }[];
  caption?: { enabled?: boolean; prompt?: string };
  output?: { dir?: string; format?: "jpg" | "png"; quality?: number };
}

function yamlToRecipe(y: RecipeYaml, id: string): Recipe {
  return {
    id,
    name: y.name ?? id,
    templateId: y.template_id ?? "",
    data: {
      sheet: y.data?.sheet ?? "",
      filter: y.data?.filter ?? {},
      limit: y.data?.limit ?? null,
    },
    photos: {
      perItem: y.photos?.per_item ?? 1,
      perSet: y.photos?.per_set ?? 0,
    },
    randomSetCount: y.random_set_count ?? 1,
    bindings: (y.bindings ?? []).map((b) => ({
      elementId: b.elementId,
      bind: b.bind,
      label: b.label,
    })),
    caption: {
      enabled: y.caption?.enabled ?? false,
      prompt: y.caption?.prompt ?? DEFAULT_CAPTION_PROMPT,
    },
    output: {
      dir: y.output?.dir ?? `output/${id}`,
      format: y.output?.format ?? "jpg",
      quality: y.output?.quality ?? 90,
    },
  };
}

function recipeToYaml(r: Recipe): RecipeYaml {
  return {
    name: r.name,
    template_id: r.templateId,
    data: {
      sheet: r.data.sheet,
      filter: Object.keys(r.data.filter).length ? r.data.filter : undefined,
      limit: r.data.limit ?? undefined,
    },
    photos: { per_item: r.photos.perItem, per_set: r.photos.perSet },
    random_set_count: r.randomSetCount,
    bindings: r.bindings.filter((b) => b.elementId && b.bind),
    caption: { enabled: r.caption.enabled, prompt: r.caption.prompt },
    output: r.output,
  };
}

export async function listRecipes(): Promise<RecipeSummary[]> {
  const dir = paths.recipesDir();
  if (!(await exists(dir))) return [];
  const entries = await readDir(dir);
  const out: RecipeSummary[] = [];
  for (const e of entries) {
    if (!e.isFile || !e.name.endsWith(".yaml")) continue;
    try {
      const y = yaml.load(await readText(join(dir, e.name))) as RecipeYaml;
      const id = e.name.replace(/\.yaml$/, "");
      out.push({
        id,
        name: y?.name ?? id,
        templateId: y?.template_id ?? "",
        sheet: y?.data?.sheet ?? "",
      });
    } catch {
      // skip invalid
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export async function loadRecipe(id: string): Promise<Recipe> {
  const y = yaml.load(await readText(paths.recipe(id))) as RecipeYaml;
  return yamlToRecipe(y ?? {}, id);
}

export async function saveRecipe(recipe: Recipe): Promise<string> {
  const id = slugify(recipe.id || recipe.name);
  await ensureDir(paths.recipesDir());
  const text = yaml.dump(recipeToYaml({ ...recipe, id }), {
    lineWidth: 120,
    noRefs: true,
  });
  await writeText(paths.recipe(id), text);
  return id;
}

async function existingRecipeIds(): Promise<Set<string>> {
  const dir = paths.recipesDir();
  if (!(await exists(dir))) return new Set();
  const entries = await readDir(dir);
  return new Set(
    entries
      .filter((e) => e.isFile && e.name.endsWith(".yaml"))
      .map((e) => e.name.replace(/\.yaml$/, "")),
  );
}

async function uniqueRecipeId(base: string): Promise<string> {
  const ids = await existingRecipeIds();
  const root = slugify(base) || "khuon";
  let id = root;
  let n = 2;
  while (ids.has(id)) id = `${root}-${n++}`;
  return id;
}

export async function duplicateRecipe(id: string): Promise<string> {
  const r = await loadRecipe(id);
  const newId = await uniqueRecipeId(`${r.name}-copy`);
  await ensureDir(paths.recipesDir());
  const text = yaml.dump(
    recipeToYaml({ ...r, id: newId, name: `${r.name} (copy)` }),
    { lineWidth: 120, noRefs: true },
  );
  await writeText(paths.recipe(newId), text);
  return newId;
}

export async function renameRecipe(id: string, name: string): Promise<void> {
  const r = await loadRecipe(id);
  await saveRecipe({ ...r, id, name });
}

export async function deleteRecipe(id: string): Promise<void> {
  await remove(paths.recipe(id));
}
