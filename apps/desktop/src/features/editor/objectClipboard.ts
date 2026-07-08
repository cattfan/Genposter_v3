import * as fabric from "fabric";

import {
  applyObjectLock,
  CUSTOM_PROPS,
  newId,
  setProp,
  tuneTextForZoom,
} from "../../lib/fabric-util.js";

type StoredObject = Record<string, unknown>;

let clipboard: StoredObject[] | null = null;

export function copyObjectsToClipboard(objects: fabric.Object[]): boolean {
  if (!objects.length) return false;
  clipboard = objects.map((o) => o.toObject([...CUSTOM_PROPS]) as StoredObject);
  return true;
}

export function hasObjectClipboard(): boolean {
  return Boolean(clipboard?.length);
}

/** Deep-clone via serialize — preserves pasted styles better than fabric.Object.clone(). */
export async function cloneCanvasObject(obj: fabric.Object): Promise<fabric.Object> {
  const data = obj.toObject([...CUSTOM_PROPS]) as StoredObject;
  const [cloned] = (await fabric.util.enlivenObjects([data])) as fabric.Object[];
  if (!cloned) throw new Error("clone failed");
  setProp(cloned, "id", newId(obj.type ?? "el"));
  applyObjectLock(cloned);
  tuneTextForZoom(cloned);
  return cloned;
}

export async function pasteObjectsFromClipboard(
  canvas: fabric.Canvas,
): Promise<fabric.Object[]> {
  if (!clipboard?.length) return [];
  const objs = (await fabric.util.enlivenObjects(clipboard)) as fabric.Object[];
  const added: fabric.Object[] = [];
  for (const obj of objs) {
    setProp(obj, "id", newId(obj.type ?? "el"));
    applyObjectLock(obj);
    obj.set({
      left: (obj.left ?? 0) + 24,
      top: (obj.top ?? 0) + 24,
    });
    obj.setCoords();
    canvas.add(obj);
    added.push(obj);
  }
  if (added.length === 1) {
    canvas.setActiveObject(added[0]!);
  } else if (added.length > 1) {
    canvas.setActiveObject(new fabric.ActiveSelection(added, { canvas }));
  }
  canvas.requestRenderAll();
  return added;
}
