import { useCallback, useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { notifications } from "@mantine/notifications";
import {
  BRAND_ORANGE,
  DEFAULT_TEMPLATE_H,
  DEFAULT_TEMPLATE_W,
  type DataGroupDef,
  type FabricScene,
} from "@genposter/schema";

import { ensureFonts } from "../../lib/fonts.js";
import {
  applyObjectLock,
  getBool,
  getId,
  isImageType,
  isTextType,
  placeholderDataUrl,
  refitImageClip,
  setProp,
  tuneAllTextForZoom,
  tuneTextForZoom,
} from "../../lib/fabric-util.js";
import { attachSnapGuides } from "./snapGuides.js";
import {
  assignObjectsToGroup,
  appendMembersToGroup,
  clearObjectGroup,
  createDataGroupDef,
  findGroup,
  getObjectGroupId,
  migrateSceneDataGroups,
  removeMemberFromGroups,
  syncGroupMembers,
  updateGroup,
} from "./dataGroups.js";
import {
  applyStylePatch,
  copyStyleFrom,
  hasStoredStyle,
  pasteStyleTo,
} from "./styleClipboard.js";
import {
  applyPageViewport,
  canvasToPageSceneJson,
  ensurePageFrame,
  findPageFrame,
  isPageFrame,
  keepPageFrameAtBack,
  normalizePageFill,
  pageBounds,
  PASTEBOARD_PAD,
  PASTEBOARD_COLOR,
  resolvePageFillFromScene,
  shiftPageToEditorCoords,
  syncPageFrameSize,
} from "./pasteboard.js";
import {
  cloneCanvasObject,
  copyObjectsToClipboard,
  hasObjectClipboard,
  pasteObjectsFromClipboard,
} from "./objectClipboard.js";

function editableTargets(c: fabric.Canvas): fabric.Object[] {
  return c.getActiveObjects().filter((o) => !isPageFrame(o));
}

export type AlignKind =
  | "left"
  | "center-h"
  | "right"
  | "top"
  | "center-v"
  | "bottom";

export interface EditorApi {
  canvasElRef: React.RefObject<HTMLCanvasElement>;
  ready: boolean;
  /** bumped on any change/selection to refresh panels. */
  tick: number;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  getCanvas: () => fabric.Canvas | null;
  getActive: () => fabric.Object | null;
  getActiveMany: () => fabric.Object[];
  getObjects: () => fabric.Object[];

  addText: (heading?: boolean) => void;
  addTextPreset: (preset: {
    text: string;
    fontSize: number;
    fontWeight?: string;
    fill?: string;
    width?: number;
  }) => void;
  addRect: () => void;
  addCircle: () => void;
  addLine: () => void;
  addImageDataUrl: (url: string) => Promise<void>;
  addImageSlot: () => Promise<void>;

  setBackgroundColor: (color: string) => void;
  setBackgroundImageDataUrl: (url: string | null) => Promise<void>;

  updateActive: (props: Record<string, unknown>) => void;
  setActiveSize: (w?: number, h?: number) => void;
  deleteSelected: () => void;
  duplicateSelected: () => Promise<void>;

  order: (dir: "front" | "back" | "forward" | "backward") => void;
  align: (kind: AlignKind) => void;
  distribute: (axis: "h" | "v") => void;
  flip: (axis: "x" | "y") => void;
  toggleLock: () => void;
  toggleVisible: (obj: fabric.Object) => void;

  selectById: (id: string) => void;
  selectObject: (obj: fabric.Object) => void;

  setGpBind: (obj: fabric.Object, bind: string, label?: string) => void;
  toggleListRow: (obj: fabric.Object) => void;

  copyStyle: () => boolean;
  pasteStyle: () => boolean;
  canPasteStyle: () => boolean;
  copyObjectsCrossPage: () => boolean;
  pasteObjectsCrossPage: () => Promise<boolean>;
  canPasteObjectsCrossPage: () => boolean;
  armFormatPainter: () => void;
  disarmFormatPainter: () => void;
  isFormatPainterArmed: () => boolean;

  getDataGroups: () => DataGroupDef[];
  createDataGroup: (label: string, mode?: DataGroupDef["mode"]) => boolean;
  addToDataGroup: (groupId: string, objects?: fabric.Object[]) => boolean;
  selectDataGroupMembers: (groupId: string) => void;
  removeFromDataGroup: (obj: fabric.Object) => void;
  updateDataGroup: (groupId: string, patch: Partial<DataGroupDef>) => void;
  groupLayout: () => void;
  ungroupLayout: () => void;

  undo: () => void;
  redo: () => void;

  setZoom: (z: number) => void;
  setCanvasSize: (w: number, h: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitTo: (cw: number, ch: number) => void;
  /** Zoom anchored at a viewport point (e.g. from a wheel event), in client (page) coordinates. */
  zoomAtClientPoint: (clientX: number, clientY: number, deltaY: number) => void;

  newDesign: () => void;
  loadScene: (scene: FabricScene) => Promise<void>;
  exportScene: () => FabricScene;
  resizeCanvasContent: (w: number, h: number, mode: "scaleContent" | "clipOnly") => void;
  addIconFromSvg: (svg: string, label?: string) => Promise<void>;
  getPasteboardPad: () => number;
  getPageBackgroundColor: () => string;
}

export function useEditor(opts?: { onSceneChange?: () => void }): EditorApi {
  const onSceneChangeRef = useRef(opts?.onSceneChange);
  onSceneChangeRef.current = opts?.onSceneChange;
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const sizeRef = useRef({ w: DEFAULT_TEMPLATE_W, h: DEFAULT_TEMPLATE_H });
  const zoomRef = useRef(0.5);
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const [zoom, setZoomState] = useState(0.5);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const restoring = useRef(false);
  const snapTimer = useRef<number | null>(null);
  const dataGroupsRef = useRef<DataGroupDef[]>([]);
  const formatPainterArmed = useRef(false);
  /** Last scene successfully exported — the fallback exportScene() returns
   * while a load/undo/redo is still in flight (see exportScene below). */
  const lastExportedRef = useRef<FabricScene | null>(null);

  const bump = useCallback(() => setTick((t) => t + 1), []);

  const notifySceneChange = useCallback(() => {
    if (restoring.current) return;
    onSceneChangeRef.current?.();
  }, []);

  const refreshHistoryFlags = useCallback(() => {
    setCanUndo(undoStack.current.length > 1);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const sceneJSON = useCallback((): string => {
    const c = canvasRef.current;
    if (!c) return "";
    const synced = syncGroupMembers(dataGroupsRef.current, c);
    dataGroupsRef.current = synced;
    return JSON.stringify({
      ...canvasToPageSceneJson(c),
      dataGroups: synced,
    });
  }, []);

  const snapshot = useCallback(() => {
    if (restoring.current) return;
    notifySceneChange();
    if (snapTimer.current) window.clearTimeout(snapTimer.current);
    snapTimer.current = window.setTimeout(() => {
      const json = sceneJSON();
      const last = undoStack.current[undoStack.current.length - 1];
      if (json && json !== last) {
        undoStack.current.push(json);
        if (undoStack.current.length > 60) undoStack.current.shift();
        redoStack.current = [];
        refreshHistoryFlags();
      }
    }, 200);
  }, [sceneJSON, refreshHistoryFlags, notifySceneChange]);

  const applyZoom = useCallback((z: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const clamped = Math.min(4, Math.max(0.05, z));
    applyPageViewport(c, sizeRef.current.w, sizeRef.current.h, clamped);
    c.requestRenderAll();
    zoomRef.current = clamped;
    setZoomState(clamped);
  }, []);

  const zoomAtClientPoint = useCallback((_clientX: number, _clientY: number, deltaY: number) => {
    const c = canvasRef.current;
    if (!c) return;

    const factor = 0.999 ** deltaY;
    const next = Math.min(4, Math.max(0.05, zoomRef.current * factor));
    applyPageViewport(c, sizeRef.current.w, sizeRef.current.h, next);
    c.requestRenderAll();
    zoomRef.current = next;
    setZoomState(next);
  }, []);

  // ---- init canvas (once) ----
  useEffect(() => {
    const el = canvasElRef.current;
    if (!el || canvasRef.current) return;
    const canvas = new fabric.Canvas(el, {
      width: sizeRef.current.w + 2 * PASTEBOARD_PAD,
      height: sizeRef.current.h + 2 * PASTEBOARD_PAD,
      backgroundColor: PASTEBOARD_COLOR,
      preserveObjectStacking: true,
      stopContextMenu: true,
    });
    canvasRef.current = canvas;
    ensurePageFrame(canvas, sizeRef.current.w, sizeRef.current.h);

    const onSelect = (e: { selected?: fabric.FabricObject[] }) => {
      if (formatPainterArmed.current && e.selected?.[0]) {
        const obj = e.selected[0];
        const patch = pasteStyleTo(obj);
        if (patch) {
          applyStylePatch(obj, patch);
          if (isImageType(obj)) refitImageClip(obj);
          canvas.requestRenderAll();
          snapshot();
        }
        formatPainterArmed.current = false;
      }
      bump();
    };
    canvas.on("selection:created", onSelect);
    canvas.on("selection:updated", onSelect);
    canvas.on("selection:cleared", () => bump());
    canvas.on("object:added", snapshot);
    canvas.on("object:removed", (e) => {
      const target = e.target;
      if (target) {
        dataGroupsRef.current = removeMemberFromGroups(
          dataGroupsRef.current,
          getId(target),
        );
      }
      snapshot();
    });
    canvas.on("object:modified", (e) => {
      const target = e.target;
      if (target && isImageType(target)) refitImageClip(target);
      snapshot();
      bump();
    });

    const detachSnapGuides = attachSnapGuides(canvas, () => sizeRef.current);

    void ensureFonts().then(() => bump());

    // seed history
    undoStack.current = [
      JSON.stringify({
        ...canvasToPageSceneJson(canvas),
        dataGroups: [],
      }),
    ];
    applyZoom(0.5);
    setReady(true);

    return () => {
      detachSnapGuides();
      canvas.dispose();
      canvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = useCallback(
    (obj: fabric.Object) => {
      const c = canvasRef.current;
      if (!c) return;
      getId(obj);
      tuneTextForZoom(obj);
      const page = pageBounds(sizeRef.current.w, sizeRef.current.h);
      obj.set({
        left:
          (obj.left ?? 0) + page.left + page.width / 2 - (obj.getScaledWidth() || 0) / 2,
        top:
          (obj.top ?? 0) + page.top + page.height / 2 - (obj.getScaledHeight() || 0) / 2,
      });
      c.add(obj);
      keepPageFrameAtBack(c);
      c.setActiveObject(obj);
      c.requestRenderAll();
      bump();
    },
    [bump],
  );

  const addText = useCallback(
    (heading = false) => {
      const t = new fabric.Textbox(heading ? "Tiêu đề" : "Văn bản", {
        width: heading ? 720 : 480,
        fontSize: heading ? 84 : 40,
        fontFamily: "Be Vietnam Pro",
        fontWeight: heading ? "700" : "400",
        fill: heading ? BRAND_ORANGE : "#1f1d1b",
        textAlign: "left",
        left: 0,
        top: 0,
      });
      add(t);
    },
    [add],
  );

  const addTextPreset = useCallback(
    (preset: {
      text: string;
      fontSize: number;
      fontWeight?: string;
      fill?: string;
      width?: number;
    }) => {
      const t = new fabric.Textbox(preset.text, {
        width: preset.width ?? 480,
        fontSize: preset.fontSize,
        fontFamily: "Be Vietnam Pro",
        fontWeight: preset.fontWeight ?? "400",
        fill: preset.fill ?? "#1f1d1b",
        textAlign: "left",
        left: 0,
        top: 0,
      });
      add(t);
    },
    [add],
  );

  const addRect = useCallback(() => {
    add(
      new fabric.Rect({
        width: 360,
        height: 240,
        fill: BRAND_ORANGE,
        rx: 0,
        ry: 0,
        left: 0,
        top: 0,
      }),
    );
  }, [add]);

  const addCircle = useCallback(() => {
    add(new fabric.Circle({ radius: 140, fill: "#ffd2b3", left: 0, top: 0 }));
  }, [add]);

  const addLine = useCallback(() => {
    add(
      new fabric.Line([0, 0, 400, 0], {
        stroke: "#1f1d1b",
        strokeWidth: 6,
        left: 0,
        top: 0,
      }),
    );
  }, [add]);

  const addImageDataUrl = useCallback(
    async (url: string) => {
      const img = await fabric.FabricImage.fromURL(url, { crossOrigin: "anonymous" });
      const maxW = sizeRef.current.w * 0.6;
      if (img.width && img.width > maxW) {
        const s = maxW / img.width;
        img.scale(s);
      }
      add(img);
    },
    [add],
  );

  const addImageSlot = useCallback(async () => {
    const url = placeholderDataUrl(480, 360, "Ảnh item");
    const img = await fabric.FabricImage.fromURL(url);
    setProp(img, "gpBind", "photo:item:0");
    setProp(img, "gpLabel", "Ảnh item");
    add(img);
  }, [add]);

  const setBackgroundColor = useCallback(
    (color: string) => {
      const c = canvasRef.current;
      if (!c) return;
      const frame = findPageFrame(c);
      if (frame) frame.set({ fill: color });
      else ensurePageFrame(c, sizeRef.current.w, sizeRef.current.h, color);
      c.backgroundImage = undefined;
      c.requestRenderAll();
      snapshot();
      bump();
    },
    [bump, snapshot],
  );

  const setBackgroundImageDataUrl = useCallback(
    async (url: string | null) => {
      const c = canvasRef.current;
      if (!c) return;
      if (!url) {
        c.backgroundImage = undefined;
      } else {
        const img = await fabric.FabricImage.fromURL(url, { crossOrigin: "anonymous" });
        const scale = Math.max(
          sizeRef.current.w / (img.width || 1),
          sizeRef.current.h / (img.height || 1),
        );
        const page = pageBounds(sizeRef.current.w, sizeRef.current.h);
        img.set({
          scaleX: scale,
          scaleY: scale,
          originX: "left",
          originY: "top",
          left: page.left,
          top: page.top,
        });
        c.backgroundImage = img;
      }
      c.requestRenderAll();
      snapshot();
      bump();
    },
    [bump, snapshot],
  );

  const updateActive = useCallback(
    (props: Record<string, unknown>) => {
      const c = canvasRef.current;
      if (!c) return;
      const targets = editableTargets(c);
      if (!targets.length) return;
      const patch = { ...props };
      let cornerRadius: number | undefined;
      if ("gpCornerRadius" in patch) {
        const raw = patch.gpCornerRadius;
        const n = typeof raw === "number" ? raw : Number(raw);
        cornerRadius = Number.isFinite(n) ? Math.max(0, n) : 0;
        delete patch.gpCornerRadius;
      }
      for (const obj of targets) {
        if (cornerRadius !== undefined) setProp(obj, "gpCornerRadius", cornerRadius);
        if (Object.keys(patch).length) obj.set(patch);
        if (isImageType(obj)) refitImageClip(obj);
        obj.setCoords();
      }
      c.requestRenderAll();
      snapshot();
      bump();
    },
    [bump, snapshot],
  );

  const setActiveSize = useCallback(
    (w?: number, h?: number) => {
      const c = canvasRef.current;
      if (!c) return;
      const targets = editableTargets(c);
      if (!targets.length) return;
      for (const obj of targets) {
        if (obj.type === "textbox" && w != null) {
          obj.set({ width: w });
        } else {
          if (w != null && obj.width) obj.set({ scaleX: w / obj.width });
          if (h != null && obj.height) obj.set({ scaleY: h / obj.height });
        }
        if (isImageType(obj)) refitImageClip(obj);
        obj.setCoords();
      }
      c.requestRenderAll();
      snapshot();
      bump();
    },
    [bump, snapshot],
  );

  const deleteSelected = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const objs = c.getActiveObjects().filter((o) => !isPageFrame(o));
    if (!objs.length) return;
    objs.forEach((o) => c.remove(o));
    c.discardActiveObject();
    keepPageFrameAtBack(c);
    c.requestRenderAll();
    bump();
  }, [bump]);

  const duplicateSelected = useCallback(async () => {
    const c = canvasRef.current;
    if (!c) return;
    const targets = editableTargets(c);
    if (!targets.length) return;
    c.discardActiveObject();
    const clones: fabric.Object[] = [];
    for (const obj of targets) {
      const clone = await cloneCanvasObject(obj);
      clone.set({
        left: (obj.left ?? 0) + 24,
        top: (obj.top ?? 0) + 24,
      });
      clone.setCoords();
      c.add(clone);
      clones.push(clone);
    }
    keepPageFrameAtBack(c);
    if (clones.length === 1) c.setActiveObject(clones[0]!);
    else if (clones.length > 1) {
      c.setActiveObject(new fabric.ActiveSelection(clones, { canvas: c }));
    }
    c.requestRenderAll();
    snapshot();
    bump();
  }, [bump, snapshot]);

  const order = useCallback(
    (dir: "front" | "back" | "forward" | "backward") => {
      const c = canvasRef.current;
      if (!c) return;
      const targets = editableTargets(c);
      if (!targets.length) return;
      for (const obj of targets) {
        if (dir === "front") c.bringObjectToFront(obj);
        else if (dir === "back") c.sendObjectToBack(obj);
        else if (dir === "forward") c.bringObjectForward(obj);
        else c.sendObjectBackwards(obj);
      }
      keepPageFrameAtBack(c);
      c.requestRenderAll();
      snapshot();
      bump();
    },
    [bump, snapshot],
  );

  const align = useCallback(
    (kind: AlignKind) => {
      const c = canvasRef.current;
      if (!c) return;
      const objs = c.getActiveObjects().filter((o) => !isPageFrame(o));
      if (!objs.length) return;
      c.discardActiveObject();
      const page = pageBounds(sizeRef.current.w, sizeRef.current.h);
      for (const o of objs) {
        const br = o.getBoundingRect();
        const dx = (o.left ?? 0) - br.left;
        const dy = (o.top ?? 0) - br.top;
        switch (kind) {
          case "left":
            o.set({ left: page.left + dx });
            break;
          case "center-h":
            o.set({ left: page.left + (page.width - br.width) / 2 + dx });
            break;
          case "right":
            o.set({ left: page.left + page.width - br.width + dx });
            break;
          case "top":
            o.set({ top: page.top + dy });
            break;
          case "center-v":
            o.set({ top: page.top + (page.height - br.height) / 2 + dy });
            break;
          case "bottom":
            o.set({ top: page.top + page.height - br.height + dy });
            break;
        }
        o.setCoords();
      }
      c.requestRenderAll();
      snapshot();
      bump();
    },
    [bump, snapshot],
  );

  const distribute = useCallback(
    (axis: "h" | "v") => {
      const c = canvasRef.current;
      if (!c) return;
      const objs = c.getActiveObjects();
      if (objs.length < 3) return;
      c.discardActiveObject();
      const rects = objs
        .map((o) => ({ o, br: o.getBoundingRect() }))
        .sort((a, b) => (axis === "h" ? a.br.left - b.br.left : a.br.top - b.br.top));
      const first = rects[0]!;
      const last = rects[rects.length - 1]!;
      const start = axis === "h" ? first.br.left : first.br.top;
      const end = axis === "h" ? last.br.left : last.br.top;
      const step = (end - start) / (rects.length - 1);
      rects.forEach((r, i) => {
        const target = start + step * i;
        if (axis === "h") r.o.set({ left: target + ((r.o.left ?? 0) - r.br.left) });
        else r.o.set({ top: target + ((r.o.top ?? 0) - r.br.top) });
        r.o.setCoords();
      });
      c.requestRenderAll();
      snapshot();
      bump();
    },
    [bump, snapshot],
  );

  const flip = useCallback(
    (axis: "x" | "y") => {
      const c = canvasRef.current;
      if (!c) return;
      const targets = editableTargets(c);
      if (!targets.length) return;
      for (const obj of targets) {
        if (axis === "x") obj.set({ flipX: !obj.flipX });
        else obj.set({ flipY: !obj.flipY });
        obj.setCoords();
      }
      c.requestRenderAll();
      snapshot();
      bump();
    },
    [bump, snapshot],
  );

  const toggleLock = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const targets = editableTargets(c);
    if (!targets.length) return;
    const locked = !getBool(targets[0]!, "gpLocked");
    for (const obj of targets) {
      setProp(obj, "gpLocked", locked);
      obj.set({
        lockMovementX: locked,
        lockMovementY: locked,
        lockScalingX: locked,
        lockScalingY: locked,
        lockRotation: locked,
        hasControls: !locked,
      });
    }
    c.requestRenderAll();
    snapshot();
    bump();
  }, [bump, snapshot]);

  const toggleVisible = useCallback(
    (obj: fabric.Object) => {
      const c = canvasRef.current;
      if (!c) return;
      obj.set({ visible: !obj.visible });
      c.requestRenderAll();
      snapshot();
      bump();
    },
    [bump, snapshot],
  );

  const selectObject = useCallback(
    (obj: fabric.Object) => {
      const c = canvasRef.current;
      if (!c) return;
      c.setActiveObject(obj);
      c.requestRenderAll();
      bump();
    },
    [bump],
  );

  const selectById = useCallback(
    (id: string) => {
      const c = canvasRef.current;
      if (!c) return;
      const obj = c.getObjects().find((o) => getId(o) === id);
      if (obj) selectObject(obj);
    },
    [selectObject],
  );

  const setGpBind = useCallback(
    (obj: fabric.Object, bind: string, label?: string) => {
      const c = canvasRef.current;
      if (!c) return;
      setProp(obj, "gpBind", bind);
      if (label !== undefined) setProp(obj, "gpLabel", label);
      snapshot();
      bump();
    },
    [bump, snapshot],
  );

  const toggleListRow = useCallback(
    (obj: fabric.Object) => {
      const cur = Boolean((obj as unknown as { gpListRow?: boolean }).gpListRow);
      setProp(obj, "gpListRow", !cur);
      snapshot();
      bump();
    },
    [bump, snapshot],
  );

  const copyStyle = useCallback(() => {
    const c = canvasRef.current;
    const obj = c?.getActiveObject();
    if (!obj) {
      notifications.show({ color: "orange", message: "Chọn đối tượng trên canvas trước khi sao chép." });
      return false;
    }
    const ok = copyStyleFrom(obj);
    if (ok) bump();
    else notifications.show({ color: "red", message: "Không sao chép được thuộc tính của loại đối tượng này." });
    return ok;
  }, [bump]);

  const pasteStyle = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return false;
    if (!hasStoredStyle()) {
      notifications.show({ color: "orange", message: "Chưa có thuộc tính nào được sao chép (Ctrl+C trước)." });
      return false;
    }
    const targets = c.getActiveObjects();
    if (!targets.length) {
      notifications.show({ color: "orange", message: "Chọn đối tượng đích trên canvas trước khi dán." });
      return false;
    }
    let applied = false;
    for (const obj of targets) {
      const patch = pasteStyleTo(obj);
      if (patch) {
        applyStylePatch(obj, patch);
        if (isImageType(obj)) refitImageClip(obj);
        applied = true;
      }
    }
    if (applied) {
      c.requestRenderAll();
      snapshot();
      bump();
    } else {
      notifications.show({ color: "red", message: "Không dán được — loại đối tượng không tương thích." });
    }
    return applied;
  }, [bump, snapshot]);

  const copyObjectsCrossPage = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return false;
    const objs = c.getActiveObjects();
    if (!objs.length) return false;
    const ok = copyObjectsToClipboard(objs);
    if (ok) bump();
    return ok;
  }, [bump]);

  const pasteObjectsCrossPage = useCallback(async () => {
    const c = canvasRef.current;
    if (!c || !hasObjectClipboard()) return false;
    const added = await pasteObjectsFromClipboard(c);
    if (!added.length) return false;
    snapshot();
    bump();
    return true;
  }, [bump, snapshot]);

  const canPasteObjectsCrossPage = useCallback(() => hasObjectClipboard(), []);

  const canPasteStyle = useCallback(() => hasStoredStyle(), []);

  const armFormatPainter = useCallback(() => {
    if (!copyStyle()) return;
    formatPainterArmed.current = true;
    bump();
  }, [copyStyle, bump]);

  const disarmFormatPainter = useCallback(() => {
    formatPainterArmed.current = false;
    bump();
  }, [bump]);

  const isFormatPainterArmed = useCallback(() => formatPainterArmed.current, []);

  const getDataGroups = useCallback(() => dataGroupsRef.current, []);

  const createDataGroup = useCallback(
    (label: string, mode: DataGroupDef["mode"] = "slot") => {
      const c = canvasRef.current;
      if (!c) return false;
      const objs = c.getActiveObjects();
      if (objs.length < 2) return false;
      const def = createDataGroupDef(
        label,
        objs.map((o) => getId(o)),
        mode,
      );
      assignObjectsToGroup(objs, def.id);
      dataGroupsRef.current = [...dataGroupsRef.current, def];
      snapshot();
      bump();
      return true;
    },
    [bump, snapshot],
  );

  const removeFromDataGroup = useCallback(
    (obj: fabric.Object) => {
      const gid = getObjectGroupId(obj);
      if (!gid) return;
      clearObjectGroup(obj);
      dataGroupsRef.current = removeMemberFromGroups(
        dataGroupsRef.current,
        getId(obj),
      );
      snapshot();
      bump();
    },
    [bump, snapshot],
  );

  const addToDataGroup = useCallback(
    (groupId: string, objects?: fabric.Object[]) => {
      const c = canvasRef.current;
      if (!c) return false;
      const g = findGroup(dataGroupsRef.current, groupId);
      if (!g) return false;
      const objs = objects?.length ? objects : c.getActiveObjects();
      if (!objs.length) return false;
      assignObjectsToGroup(objs, groupId);
      dataGroupsRef.current = appendMembersToGroup(
        dataGroupsRef.current,
        groupId,
        objs.map((o) => getId(o)),
      );
      snapshot();
      bump();
      return true;
    },
    [bump, snapshot],
  );

  const selectDataGroupMembers = useCallback(
    (groupId: string) => {
      const c = canvasRef.current;
      if (!c) return;
      const g = findGroup(dataGroupsRef.current, groupId);
      if (!g) return;
      const objs = g.memberIds
        .map((id) => c.getObjects().find((o) => getId(o) === id))
        .filter((o): o is fabric.Object => Boolean(o));
      if (!objs.length) return;
      if (objs.length === 1) c.setActiveObject(objs[0]!);
      else c.setActiveObject(new fabric.ActiveSelection(objs, { canvas: c }));
      c.requestRenderAll();
      bump();
    },
    [bump],
  );

  const updateDataGroup = useCallback(
    (groupId: string, patch: Partial<DataGroupDef>) => {
      dataGroupsRef.current = updateGroup(dataGroupsRef.current, groupId, patch);
      snapshot();
      bump();
    },
    [bump, snapshot],
  );

  const groupLayout = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const objs = c.getActiveObjects();
    if (objs.length < 2) return;
    c.discardActiveObject();
    for (const o of objs) c.remove(o);
    const group = new fabric.Group(objs);
    const layoutId = getId(group);
    const memberIds = objs.map((o) => getId(o));
    dataGroupsRef.current = dataGroupsRef.current.map((g) =>
      g.memberIds.some((id) => memberIds.includes(id))
        ? { ...g, layoutGroupId: layoutId }
        : g,
    );
    c.add(group);
    c.setActiveObject(group);
    c.requestRenderAll();
    snapshot();
    bump();
  }, [bump, snapshot]);

  const ungroupLayout = useCallback(() => {
    const c = canvasRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj || obj.type !== "group") return;
    const g = obj as fabric.Group;
    const items = [...g.getObjects()];
    c.remove(g);
    for (const item of items) c.add(item);
    c.discardActiveObject();
    c.requestRenderAll();
    snapshot();
    bump();
  }, [bump, snapshot]);

  const restore = useCallback(
    (json: string) => {
      const c = canvasRef.current;
      if (!c || !json) return;
      restoring.current = true;
      const parsed = JSON.parse(json) as FabricScene;
      dataGroupsRef.current = (parsed.dataGroups as DataGroupDef[] | undefined) ?? [];
      const { dataGroups: _dg, ...canvasJson } = parsed;
      void _dg;
      const pageFill = resolvePageFillFromScene(canvasJson as Record<string, unknown>);
      canvasJson.backgroundColor = pageFill;
      delete (canvasJson as Record<string, unknown>).background;
      void c.loadFromJSON(canvasJson).then(() => {
        for (const obj of [...c.getObjects()]) {
          if (isPageFrame(obj)) c.remove(obj);
        }
        c.backgroundColor = PASTEBOARD_COLOR;
        shiftPageToEditorCoords(c);
        ensurePageFrame(c, sizeRef.current.w, sizeRef.current.h, pageFill);
        applyPageViewport(c, sizeRef.current.w, sizeRef.current.h, zoomRef.current);
        for (const obj of c.getObjects()) {
          applyObjectLock(obj);
          tuneTextForZoom(obj);
          if (isImageType(obj)) refitImageClip(obj);
        }
        tuneAllTextForZoom(c);
        dataGroupsRef.current = syncGroupMembers(dataGroupsRef.current, c);
        c.requestRenderAll();
        lastExportedRef.current = {
          ...canvasToPageSceneJson(c),
          dataGroups: dataGroupsRef.current,
        } as unknown as FabricScene;
        restoring.current = false;
        refreshHistoryFlags();
        bump();
      });
    },
    [bump, refreshHistoryFlags],
  );

  const undo = useCallback(() => {
    if (undoStack.current.length < 2) return;
    const cur = undoStack.current.pop()!;
    redoStack.current.push(cur);
    restore(undoStack.current[undoStack.current.length - 1]!);
  }, [restore]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(next);
    restore(next);
  }, [restore]);

  const zoomIn = useCallback(() => applyZoom(zoom * 1.15), [applyZoom, zoom]);
  const zoomOut = useCallback(() => applyZoom(zoom / 1.15), [applyZoom, zoom]);
  const fitTo = useCallback(
    (cw: number, ch: number) => {
      const z = Math.min(cw / sizeRef.current.w, ch / sizeRef.current.h);
      applyZoom(Math.max(0.05, z * 0.95));
    },
    [applyZoom],
  );

  const setCanvasSize = useCallback(
    (w: number, h: number) => {
      sizeRef.current = { w, h };
      const c = canvasRef.current;
      if (c) syncPageFrameSize(c, w, h);
      applyZoom(zoomRef.current);
    },
    [applyZoom],
  );

  const resizeCanvasContent = useCallback(
    (w: number, h: number, mode: "scaleContent" | "clipOnly") => {
      const c = canvasRef.current;
      if (!c || w < 1 || h < 1) return;
      const oldW = sizeRef.current.w;
      const oldH = sizeRef.current.h;
      if (mode === "scaleContent" && oldW > 0 && oldH > 0) {
        const sx = w / oldW;
        const sy = h / oldH;
        const pad = PASTEBOARD_PAD;
        for (const obj of c.getObjects()) {
          if (isPageFrame(obj)) continue;
          const pageLeft = (obj.left ?? 0) - pad;
          const pageTop = (obj.top ?? 0) - pad;
          obj.set({
            left: pageLeft * sx + pad,
            top: pageTop * sy + pad,
            scaleX: (obj.scaleX ?? 1) * sx,
            scaleY: (obj.scaleY ?? 1) * sy,
          });
          if (isImageType(obj)) refitImageClip(obj);
          obj.setCoords();
        }
        const bg = c.backgroundImage as fabric.FabricImage | undefined;
        if (bg) {
          const pageLeft = (bg.left ?? pad) - pad;
          const pageTop = (bg.top ?? pad) - pad;
          bg.set({
            left: pageLeft * sx + pad,
            top: pageTop * sy + pad,
            scaleX: (bg.scaleX ?? 1) * sx,
            scaleY: (bg.scaleY ?? 1) * sy,
          });
        }
      }
      sizeRef.current = { w, h };
      syncPageFrameSize(c, w, h);
      applyZoom(zoomRef.current);
      snapshot();
      bump();
    },
    [applyZoom, bump, snapshot],
  );

  const addIconFromSvg = useCallback(
    async (svg: string, label?: string) => {
      const parsed = await fabric.loadSVGFromString(svg);
      const objs = parsed.objects.filter((o): o is fabric.FabricObject => Boolean(o));
      if (!objs.length) return;
      const group =
        objs.length === 1
          ? objs[0]!
          : fabric.util.groupSVGElements(objs, parsed.options);
      group.scaleToWidth(96);
      if (label) setProp(group, "gpLabel", label);
      add(group);
    },
    [add],
  );

  const newDesign = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.clear();
    c.backgroundColor = PASTEBOARD_COLOR;
    ensurePageFrame(c, sizeRef.current.w, sizeRef.current.h);
    dataGroupsRef.current = [];
    c.requestRenderAll();
    undoStack.current = [
      JSON.stringify({
        ...canvasToPageSceneJson(c),
        dataGroups: [],
      }),
    ];
    redoStack.current = [];
    refreshHistoryFlags();
    bump();
  }, [bump, refreshHistoryFlags]);

  const loadScene = useCallback(
    async (scene: FabricScene) => {
      const c = canvasRef.current;
      if (!c) return;
      const migrated = migrateSceneDataGroups(scene);
      dataGroupsRef.current = (migrated.dataGroups as DataGroupDef[] | undefined) ?? [];
      restoring.current = true;
      const { dataGroups: _dg, ...canvasJson } = migrated;
      void _dg;
      const pageFill = resolvePageFillFromScene(canvasJson as Record<string, unknown>);
      canvasJson.backgroundColor = pageFill;
      delete (canvasJson as Record<string, unknown>).background;
      await c.loadFromJSON(canvasJson);
      for (const obj of [...c.getObjects()]) {
        if (isPageFrame(obj)) c.remove(obj);
      }
      c.backgroundColor = PASTEBOARD_COLOR;
      shiftPageToEditorCoords(c);
      ensurePageFrame(c, sizeRef.current.w, sizeRef.current.h, pageFill);
      applyPageViewport(c, sizeRef.current.w, sizeRef.current.h, zoomRef.current);
      for (const obj of c.getObjects()) {
        applyObjectLock(obj);
        tuneTextForZoom(obj);
        if (isImageType(obj)) refitImageClip(obj);
      }
      tuneAllTextForZoom(c);
      dataGroupsRef.current = syncGroupMembers(dataGroupsRef.current, c);
      c.requestRenderAll();
      const loaded = {
        ...canvasToPageSceneJson(c),
        dataGroups: dataGroupsRef.current,
      } as unknown as FabricScene;
      lastExportedRef.current = loaded;
      restoring.current = false;
      undoStack.current = [JSON.stringify(loaded)];
      redoStack.current = [];
      refreshHistoryFlags();
      bump();
    },
    [bump, refreshHistoryFlags],
  );

  const exportScene = useCallback((): FabricScene => {
    const c = canvasRef.current;
    if (!c) return lastExportedRef.current ?? ({ objects: [], dataGroups: [] } as FabricScene);
    if (restoring.current) {
      // A scene load/undo/redo is still in flight — the canvas is mid
      // loadFromJSON and may hold half-populated objects. Capturing it now
      // (e.g. from a racing autosave) could overwrite a page's real content
      // with garbage, so return the last known-good export instead.
      return lastExportedRef.current ?? ({ objects: [], dataGroups: [] } as FabricScene);
    }
    const synced = syncGroupMembers(dataGroupsRef.current, c);
    dataGroupsRef.current = synced;
    const scene = {
      ...canvasToPageSceneJson(c),
      dataGroups: synced,
    } as unknown as FabricScene;
    lastExportedRef.current = scene;
    return scene;
  }, []);

  const getPasteboardPad = useCallback(() => PASTEBOARD_PAD, []);

  const getPageBackgroundColor = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return "#ffffff";
    const frame = findPageFrame(c);
    const fill = frame?.fill;
    return typeof fill === "string" ? normalizePageFill(fill) : "#ffffff";
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el as HTMLElement | null)?.isContentEditable;
      const active = canvasRef.current?.getActiveObject();
      const editingText = Boolean((active as fabric.IText | undefined)?.isEditing);
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const styleShortcut =
        mod &&
        !e.altKey &&
        ((key === "c" && !e.shiftKey) || (key === "v" && !e.shiftKey) || (e.shiftKey && (key === "c" || key === "v")));
      const editingContentField =
        typing && el instanceof HTMLTextAreaElement && Boolean(el.closest(".panel, .inspector-dock"));

      if (editingText) return;
      if (typing && !styleShortcut) return;
      if (styleShortcut && editingContentField) return;

      const text = active && isTextType(active) ? (active as fabric.Textbox) : null;

      const patchText = (patch: Record<string, unknown>) => {
        const c = canvasRef.current;
        if (!c || !text) return;
        text.set(patch);
        text.setCoords();
        c.requestRenderAll();
        snapshot();
        bump();
      };

      if (key === "escape") {
        if (formatPainterArmed.current) {
          e.preventDefault();
          disarmFormatPainter();
        }
        return;
      }

      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (mod && e.altKey && key === "c") {
        e.preventDefault();
        armFormatPainter();
      } else if (mod && text && key === "b" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const on = Number(text.fontWeight ?? 400) >= 700;
        patchText({ fontWeight: on ? "400" : "700" });
      } else if (mod && text && key === "i" && !e.shiftKey) {
        e.preventDefault();
        patchText({ fontStyle: text.fontStyle === "italic" ? "normal" : "italic" });
      } else if (mod && text && key === "u" && !e.shiftKey) {
        e.preventDefault();
        patchText({ underline: !text.underline });
      } else if (mod && e.shiftKey && text && key === "s") {
        e.preventDefault();
        patchText({ linethrough: !text.linethrough });
      } else if (mod && e.shiftKey && text && key === "k") {
        e.preventDefault();
        const s = text.text ?? "";
        if (!s) return;
        const upper = s === s.toUpperCase() && s !== s.toLowerCase();
        patchText({ text: upper ? s.toLowerCase() : s.toUpperCase() });
      } else if (mod && key === "c" && !e.shiftKey && !e.altKey) {
        if (!canvasRef.current?.getActiveObject()) return;
        if (copyStyle()) e.preventDefault();
      } else if (mod && key === "v" && !e.shiftKey && !e.altKey) {
        if (!canvasRef.current?.getActiveObject()) return;
        if (pasteStyle()) e.preventDefault();
      } else if (mod && e.shiftKey && key === "c") {
        if (!canvasRef.current?.getActiveObject()) return;
        if (copyStyle()) e.preventDefault();
      } else if (mod && e.shiftKey && key === "v") {
        if (!canvasRef.current?.getActiveObject()) return;
        if (pasteStyle()) e.preventDefault();
      } else if (mod && e.altKey && key === "v") {
        if (!hasObjectClipboard()) return;
        e.preventDefault();
        void pasteObjectsCrossPage();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        void duplicateSelected();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [
    undo,
    redo,
    duplicateSelected,
    deleteSelected,
    copyStyle,
    pasteStyle,
    copyObjectsCrossPage,
    pasteObjectsCrossPage,
    armFormatPainter,
    disarmFormatPainter,
    snapshot,
    bump,
  ]);

  return {
    canvasElRef,
    ready,
    tick,
    zoom,
    canUndo,
    canRedo,
    getCanvas: () => canvasRef.current,
    getActive: () => canvasRef.current?.getActiveObject() ?? null,
    getActiveMany: () => canvasRef.current?.getActiveObjects() ?? [],
    getObjects: () => canvasRef.current?.getObjects() ?? [],
    addText,
    addTextPreset,
    addRect,
    addCircle,
    addLine,
    addImageDataUrl,
    addImageSlot,
    setBackgroundColor,
    setBackgroundImageDataUrl,
    updateActive,
    setActiveSize,
    deleteSelected,
    duplicateSelected,
    order,
    align,
    distribute,
    flip,
    toggleLock,
    toggleVisible,
    selectById,
    selectObject,
    setGpBind,
    toggleListRow,
    copyStyle,
    pasteStyle,
    canPasteStyle,
    copyObjectsCrossPage,
    pasteObjectsCrossPage,
    canPasteObjectsCrossPage,
    armFormatPainter,
    disarmFormatPainter,
    isFormatPainterArmed,
    getDataGroups,
    createDataGroup,
    addToDataGroup,
    selectDataGroupMembers,
    removeFromDataGroup,
    updateDataGroup,
    groupLayout,
    ungroupLayout,
    undo,
    redo,
    setZoom: applyZoom,
    setCanvasSize,
    zoomIn,
    zoomOut,
    fitTo,
    zoomAtClientPoint,
    newDesign,
    loadScene,
    exportScene,
    resizeCanvasContent,
    addIconFromSvg,
    getPasteboardPad,
    getPageBackgroundColor,
  };
}
