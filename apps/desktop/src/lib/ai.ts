import type { Recipe, Slide } from "@genposter/schema";

import { aiKey, fillTokens } from "./bind.js";
import { settings } from "./settings.js";

/**
 * AI text transform hook (Tab 2). For every binding shaped `ai:<prompt>`, this
 * generates text per item and stashes it under aiKey(elementId) on each item so
 * the renderer can read it. No-op when no API key is configured.
 *
 * The prompt template may use {{item.name}}, {{item.desc}}, {{title}}, etc.
 */
export async function applyAiBindings(recipe: Recipe, slides: Slide[]): Promise<void> {
  const aiBinds = recipe.bindings.filter((b) => b.bind.startsWith("ai:"));
  if (!aiBinds.length) return;

  const cfg = settings().ai;
  if (!cfg.apiKey || !cfg.baseUrl) return; // framework present, generation disabled

  for (const slide of slides) {
    for (let n = 0; n < slide.items.length; n++) {
      const item = slide.items[n]!;
      for (const b of aiBinds) {
        const prompt = fillTokens(b.bind.slice(3), { slide, item, n: n + 1 });
        try {
          item[aiKey(b.elementId)] = await complete(cfg, prompt);
        } catch {
          item[aiKey(b.elementId)] = "";
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
