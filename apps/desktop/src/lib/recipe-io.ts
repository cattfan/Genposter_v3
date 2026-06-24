import yaml from "js-yaml";
import type { Recipe } from "@genposter/schema";

import { ensureDir, exists, readDir, readText, writeText } from "./fsx.js";
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
  title?: string;
  subtitle?: string;
  data?: {
    sheet?: string;
    filter?: Record<string, string>;
    items_per_slide?: number;
    limit?: number | null;
  };
  photos?: { per_item?: number; per_slide?: number };
  bindings?: { elementId: string; bind: string; label?: string }[];
  list_row?: {
    element_ids?: string[];
    row_height?: number;
    gap?: number;
    max_rows?: number;
  } | null;
  output?: { dir?: string; format?: "jpg" | "png"; quality?: number };
}

function yamlToRecipe(y: RecipeYaml, id: string): Recipe {
  const lr = y.list_row;
  return {
    id,
    name: y.name ?? id,
    templateId: y.template_id ?? "",
    title: y.title ?? "",
    subtitle: y.subtitle ?? "",
    data: {
      sheet: y.data?.sheet ?? "",
      filter: y.data?.filter ?? {},
      itemsPerSlide: y.data?.items_per_slide ?? 7,
      limit: y.data?.limit ?? null,
    },
    photos: {
      perItem: y.photos?.per_item ?? 1,
      perSlide: y.photos?.per_slide ?? 0,
    },
    bindings: (y.bindings ?? []).map((b) => ({
      elementId: b.elementId,
      bind: b.bind,
      label: b.label,
    })),
    listRow:
      lr && lr.element_ids && lr.element_ids.length
        ? {
            elementIds: lr.element_ids,
            rowHeight: lr.row_height ?? 110,
            gap: lr.gap ?? 8,
            maxRows: lr.max_rows ?? y.data?.items_per_slide ?? 7,
          }
        : null,
    output: {
      dir: y.output?.dir ?? `output/${id}`,
      format: y.output?.format ?? "jpg",
      quality: y.output?.quality ?? 90,
    },
  };
}

function recipeToYaml(r: Recipe): RecipeYaml {
  const y: RecipeYaml = {
    name: r.name,
    template_id: r.templateId,
    title: r.title,
    subtitle: r.subtitle,
    data: {
      sheet: r.data.sheet,
      filter: Object.keys(r.data.filter).length ? r.data.filter : undefined,
      items_per_slide: r.data.itemsPerSlide,
      limit: r.data.limit ?? undefined,
    },
    photos: { per_item: r.photos.perItem, per_slide: r.photos.perSlide },
    bindings: r.bindings.filter((b) => b.elementId && b.bind),
    output: r.output,
  };
  if (r.listRow && r.listRow.elementIds.length) {
    y.list_row = {
      element_ids: r.listRow.elementIds,
      row_height: r.listRow.rowHeight,
      gap: r.listRow.gap,
      max_rows: r.listRow.maxRows,
    };
  }
  return y;
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
