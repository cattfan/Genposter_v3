import type { GeneratedSet, Recipe } from "@genposter/schema";

import { aiKey, fillTokens } from "./bind.js";
import type { KhuonPlan } from "./khuon-plan.js";
import { settings } from "./settings.js";

/**
 * AI text transform hook. For every binding shaped `ai:<prompt>`, generate text
 * per assigned row and stash it under aiKey(elementId) so the renderer can read
 * it. No-op when no API key is configured.
 */
export async function applyAiBindings(
  recipe: Recipe,
  sets: GeneratedSet[],
  plan: KhuonPlan,
): Promise<void> {
  const aiBinds = recipe.bindings.filter((b) => b.bind.startsWith("ai:"));
  if (!aiBinds.length) return;

  const cfg = settings().ai;
  if (!cfg.apiKey || !cfg.baseUrl) return; // framework present, generation disabled

  const promptByEl = new Map(aiBinds.map((b) => [b.elementId, b.bind.slice(3)]));
  const membersByPageGroup = new Map<string, string[]>();
  for (const p of plan.pages) {
    for (const g of p.groups) membersByPageGroup.set(`${p.pageId}::${g.id}`, g.memberIds);
  }

  for (const set of sets) {
    for (const page of set.pages) {
      for (const gf of page.groups) {
        const memberIds = membersByPageGroup.get(`${page.pageId}::${gf.groupId}`) ?? [];
        for (const elId of memberIds) {
          const prompt = promptByEl.get(elId);
          if (!prompt) continue;
          for (let i = 0; i < gf.rows.length; i++) {
            const row = gf.rows[i]!;
            const filled = fillTokens(prompt, { row, n: i + 1 });
            try {
              row[aiKey(elId)] = await complete(cfg, filled);
            } catch {
              row[aiKey(elId)] = "";
            }
          }
        }
      }
    }
  }
}

export interface AiCfg {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** True when the AI API is usable (base URL + key present). */
export function aiConfigured(): boolean {
  const cfg = settings().ai;
  return Boolean(cfg.apiKey && cfg.baseUrl);
}

interface CompleteOpts {
  system?: string;
  temperature?: number;
}

async function complete(
  cfg: AiCfg,
  prompt: string,
  opts: CompleteOpts = {},
): Promise<string> {
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        {
          role: "system",
          content:
            opts.system ??
            "Bạn viết nội dung ngắn gọn cho ảnh poster du lịch tiếng Việt. Chỉ trả về văn bản, không giải thích.",
        },
        { role: "user", content: prompt },
      ],
      temperature: opts.temperature ?? 0.7,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

/** Unique item names appearing in one generated set (context for captions/UI). */
export function setItemNames(set: GeneratedSet): string[] {
  const names: string[] = [];
  for (const p of set.pages) {
    for (const g of p.groups) {
      for (const r of g.rows) {
        const n = String(r.name ?? "").trim();
        if (n && !names.includes(n)) names.push(n);
      }
    }
  }
  return names;
}

/**
 * Generate one TikTok caption per set (setIndex -> caption). Sets whose call
 * fails map to "" so the UI can show an editable empty caption.
 */
export async function generateCaptions(
  recipe: Recipe,
  sets: GeneratedSet[],
  onProgress?: (done: number, total: number) => void,
): Promise<Record<number, string>> {
  const out: Record<number, string> = {};
  if (!recipe.caption?.enabled) return out;

  const cfg = settings().ai;
  if (!cfg.apiKey || !cfg.baseUrl) return out;

  let done = 0;
  for (const set of sets) {
    const names = setItemNames(set);
    const ctx = names.length
      ? `\n\nDữ liệu bộ ảnh này (các mục xuất hiện):\n${names.map((n) => `- ${n}`).join("\n")}`
      : "";
    try {
      out[set.setIndex] = await complete(cfg, recipe.caption.prompt + ctx, {
        system:
          "Bạn là copywriter TikTok tiếng Việt. Chỉ trả về caption hoàn chỉnh, không giải thích, không markdown.",
        temperature: 1.2,
      });
    } catch {
      out[set.setIndex] = "";
    }
    done++;
    onProgress?.(done, sets.length);
  }
  return out;
}

export type AiTestResult =
  | { ok: true; ms: number; reply: string }
  | { ok: false; ms: number; error: string };

/** Fire a tiny completion against the given config to validate URL/key/model. */
export async function testAi(cfg: AiCfg): Promise<AiTestResult> {
  const t0 = performance.now();
  try {
    if (!cfg.baseUrl) throw new Error("Chưa nhập Base URL");
    if (!cfg.apiKey) throw new Error("Chưa nhập API key");
    if (!cfg.model) throw new Error("Chưa nhập model");
    const reply = await complete(cfg, 'Trả lời đúng một từ: "OK"', {
      system: "Trả lời ngắn nhất có thể.",
      temperature: 0,
    });
    return { ok: true, ms: Math.round(performance.now() - t0), reply };
  } catch (e) {
    return {
      ok: false,
      ms: Math.round(performance.now() - t0),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
