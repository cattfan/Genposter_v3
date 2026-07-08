import type { TemplateSetSummary } from "../../lib/templateset-io.js";

export function filterTemplateSets(
  sets: TemplateSetSummary[],
  query: string,
): TemplateSetSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return sets;
  return sets.filter((s) => s.name.toLowerCase().includes(q));
}

export function formatRelativeTime(iso?: string): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(t).toLocaleDateString("vi-VN");
}
