import { FIELD_LABELS } from "@genposter/schema";

export interface BindOption {
  value: string;
  label: string;
}

/** Build the dropdown options for a binding cell, depending on element kind. */
export function buildBindOptions(fields: string[], isImage: boolean): BindOption[] {
  const out: BindOption[] = [{ value: "", label: "— Không gán —" }];

  if (isImage) {
    out.push({ value: "photo:item:0", label: "Ảnh dòng — #1" });
    out.push({ value: "photo:item:1", label: "Ảnh dòng — #2" });
    out.push({ value: "photo:item:2", label: "Ảnh dòng — #3" });
    out.push({ value: "photo:set:0", label: "Ảnh chung bộ — #1" });
    out.push({ value: "photo:set:1", label: "Ảnh chung bộ — #2" });
    return out;
  }

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

export interface BindingValidationIssue {
  elementId: string;
  label: string;
  message: string;
}

/** Validate bindings before generate — hard block on missing or incomplete binds. */
export function validateBindings(
  bindings: Record<string, string>,
  elements: { id: string; label: string; isImage: boolean }[],
): BindingValidationIssue[] {
  const issues: BindingValidationIssue[] = [];
  for (const el of elements) {
    const bind = bindings[el.id] ?? "";
    if (!bind) {
      issues.push({
        elementId: el.id,
        label: el.label,
        message: "Chưa gán nguồn dữ liệu",
      });
      continue;
    }
    const kind = bindKind(bind);
    if (kind === "static" && bind.length <= 7) {
      issues.push({
        elementId: el.id,
        label: el.label,
        message: "Văn bản cố định chưa nhập nội dung",
      });
    }
    if (kind === "ai" && bind.length <= 3) {
      issues.push({
        elementId: el.id,
        label: el.label,
        message: "Prompt AI chưa nhập",
      });
    }
    if (el.isImage && bind.startsWith("item.")) {
      issues.push({
        elementId: el.id,
        label: el.label,
        message: "Ảnh không thể gán trường văn bản",
      });
    }
    if (!el.isImage && bind.startsWith("photo:")) {
      issues.push({
        elementId: el.id,
        label: el.label,
        message: "Văn bản không thể gán nguồn ảnh",
      });
    }
  }
  return issues;
}

export function bindingStats(
  bindings: Record<string, string>,
  elements: { id: string }[],
): { bound: number; total: number } {
  const total = elements.length;
  const bound = elements.filter((e) => Boolean(bindings[e.id])).length;
  return { bound, total };
}
