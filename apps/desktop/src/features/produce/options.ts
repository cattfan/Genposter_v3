import { FIELD_LABELS, SLIDE_BIND_OPTIONS } from "@genposter/schema";

export interface BindOption {
  value: string;
  label: string;
}

/** Build the dropdown options for a binding cell, depending on element kind. */
export function buildBindOptions(fields: string[], isImage: boolean): BindOption[] {
  const out: BindOption[] = [{ value: "", label: "— Không gán —" }];

  if (isImage) {
    out.push({ value: "photo:item:0", label: "Ảnh mục #1" });
    out.push({ value: "photo:item:1", label: "Ảnh mục #2" });
    out.push({ value: "photo:item:2", label: "Ảnh mục #3" });
    out.push({ value: "photo:slide:0", label: "Ảnh slide #1" });
    out.push({ value: "photo:slide:1", label: "Ảnh slide #2" });
    return out;
  }

  for (const o of SLIDE_BIND_OPTIONS) out.push({ value: o.bind, label: o.label });
  out.push({ value: "n", label: "STT (số thứ tự)" });
  for (const f of fields) {
    out.push({ value: `item.${f}`, label: `Mục: ${FIELD_LABELS[f] ?? f}` });
  }
  out.push({ value: "static:", label: "Văn bản cố định…" });
  out.push({ value: "ai:", label: "AI sinh chữ…" });
  return out;
}

/** Which editing affordance a binding value needs. */
export function bindKind(bind: string): "plain" | "static" | "ai" {
  if (bind.startsWith("static:")) return "static";
  if (bind.startsWith("ai:")) return "ai";
  return "plain";
}
