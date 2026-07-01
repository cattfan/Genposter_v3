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

interface AiCfg {
  baseUrl: string;
  apiKey: string;
  model: string;
}

async function complete(cfg: AiCfg, prompt: string): Promise<string> {
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
            "Bạn viết nội dung ngắn gọn cho ảnh poster du lịch tiếng Việt. Chỉ trả về văn bản, không giải thích.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return (data.choices?.[0]?.message?.content ?? "").trim();
}
