import type { ElementInfo } from "./elements.js";

let singleBind: string | null = null;
let groupClipboard: { binds: Record<string, string>; sourceIds: string[] } | null =
  null;

export function copyBinding(bind: string): void {
  singleBind = bind;
}

export function pasteBinding(): string | null {
  return singleBind;
}

export function hasBindingClipboard(): boolean {
  return singleBind !== null;
}

export function copyGroupBindings(
  memberIds: string[],
  bindings: Record<string, string>,
): void {
  const binds: Record<string, string> = {};
  for (const id of memberIds) binds[id] = bindings[id] ?? "";
  groupClipboard = { binds, sourceIds: memberIds };
}

export function hasGroupBindingClipboard(): boolean {
  return groupClipboard !== null && Object.keys(groupClipboard.binds).length > 0;
}

export function pasteGroupBindings(
  sourceMembers: ElementInfo[],
  targetMembers: ElementInfo[],
  bindings: Record<string, string>,
): Record<string, string> {
  if (!groupClipboard) return bindings;
  const next = { ...bindings };
  const { binds, sourceIds } = groupClipboard;

  sourceIds.forEach((srcId, i) => {
    const bind = binds[srcId];
    const tgt = targetMembers[i];
    if (tgt && bind) next[tgt.id] = bind;
  });

  const srcByType = (pred: (t: string) => boolean) =>
    sourceMembers.filter((m) => pred(m.type));
  const tgtByType = (pred: (t: string) => boolean) =>
    targetMembers.filter((m) => pred(m.type));
  const isText = (t: string) => t === "textbox" || t === "i-text" || t === "text";
  const isImg = (t: string) => t === "image";

  for (const pred of [isText, isImg] as const) {
    const src = srcByType(pred);
    const tgt = tgtByType(pred);
    src.forEach((s, i) => {
      const bind = binds[s.id];
      if (bind && tgt[i]) next[tgt[i].id] = bind;
    });
  }

  return next;
}

export function getGroupClipboardSourceIds(): string[] {
  return groupClipboard?.sourceIds ?? [];
}
