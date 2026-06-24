import { useCallback, useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { BRAND_ORANGE, CANVAS_H, CANVAS_W, type FabricScene } from "@genposter/schema";

import { ensureFonts } from "../../lib/fonts.js";
import {
  CUSTOM_PROPS,
  getId,
  placeholderDataUrl,
  setProp,
} from "../../lib/fabric-util.js";

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

  undo: () => void;
  redo: () => void;

  setZoom: (z: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitTo: (cw: number, ch: number) => void;

  newDesign: () => void;
  loadScene: (scene: FabricScene) => Promise<void>;
  exportScene: () => FabricScene;
}

export function useEditor(): EditorApi {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const [zoom, setZoomState] = useState(0.5);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const restoring = useRef(false);
  const snapTimer = useRef<number | null>(null);

  const bump = useCallback(() => setTick((t) => t + 1), []);

  const refreshHistoryFlags = useCallback(() => {
    setCanUndo(undoStack.current.length > 1);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const sceneJSON = useCallback((): string => {
    const c = canvasRef.current;
    if (!c) return "";
    return JSON.stringify(c.toObject([...CUSTOM_PROPS]));
  }, []);

  const snapshot = useCallback(() => {
    if (restoring.current) return;
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
  }, [sceneJSON, refreshHistoryFlags]);

  const applyZoom = useCallback((z: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const clamped = Math.min(4, Math.max(0.05, z));
    c.setZoom(clamped);
    c.setDimensions({ width: CANVAS_W * clamped, height: CANVAS_H * clamped });
    c.requestRenderAll();
    setZoomState(clamped);
  }, []);

  // ---- init canvas (once) ----
  useEffect(() => {
    const el = canvasElRef.current;
    if (!el || canvasRef.current) return;
    const canvas = new fabric.Canvas(el, {
      width: CANVAS_W,
      height: CANVAS_H,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
    });
    canvasRef.current = canvas;

    const onSelect = () => bump();
    canvas.on("selection:created", onSelect);
    canvas.on("selection:updated", onSelect);
    canvas.on("selection:cleared", onSelect);
    canvas.on("object:added", snapshot);
    canvas.on("object:removed", snapshot);
    canvas.on("object:modified", () => {
      snapshot();
      bump();
    });

    void ensureFonts().then(() => bump());

    // seed history
    undoStack.current = [JSON.stringify(canvas.toObject([...CUSTOM_PROPS]))];
    applyZoom(0.5);
    setReady(true);

    return () => {
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
      // place near center of page
      obj.set({
        left: (obj.left ?? 0) + CANVAS_W / 2 - (obj.getScaledWidth() || 0) / 2,
        top: (obj.top ?? 0) + CANVAS_H / 2 - (obj.getScaledHeight() || 0) / 2,
      });
      c.add(obj);
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
      const maxW = CANVAS_W * 0.6;
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
      c.backgroundColor = color;
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
        const scale = Math.max(CANVAS_W / (img.width || 1), CANVAS_H / (img.height || 1));
        img.set({ scaleX: scale, scaleY: scale, originX: "left", originY: "top", left: 0, top: 0 });
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
      const obj = c?.getActiveObject();
      if (!c || !obj) return;
      obj.set(props);
      obj.setCoords();
      c.requestRenderAll();
      snapshot();
      bump();
    },
    [bump, snapshot],
  );

  const setActiveSize = useCallback(
    (w?: number, h?: number) => {
      const c = canvasRef.current;
      const obj = c?.getActiveObject();
      if (!c || !obj) return;
      if (obj.type === "textbox" && w != null) {
        obj.set({ width: w });
      } else {
        if (w != null && obj.width) obj.set({ scaleX: w / obj.width });
        if (h != null && obj.height) obj.set({ scaleY: h / obj.height });
      }
      obj.setCoords();
      c.requestRenderAll();
      snapshot();
      bump();
    },
    [bump, snapshot],
  );

  const deleteSelected = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const objs = c.getActiveObjects();
    if (!objs.length) return;
    objs.forEach((o) => c.remove(o));
    c.discardActiveObject();
    c.requestRenderAll();
    bump();
  }, [bump]);

  const duplicateSelected = useCallback(async () => {
    const c = canvasRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj) return;
    const clone = await obj.clone([...CUSTOM_PROPS]);
    setProp(clone, "id", `${obj.type ?? "el"}_${Date.now().toString(36)}`);
    clone.set({ left: (obj.left ?? 0) + 24, top: (obj.top ?? 0) + 24 });
    c.add(clone);
    c.setActiveObject(clone);
    c.requestRenderAll();
    bump();
  }, [bump]);

  const order = useCallback(
    (dir: "front" | "back" | "forward" | "backward") => {
      const c = canvasRef.current;
      const obj = c?.getActiveObject();
      if (!c || !obj) return;
      if (dir === "front") c.bringObjectToFront(obj);
      else if (dir === "back") c.sendObjectToBack(obj);
      else if (dir === "forward") c.bringObjectForward(obj);
      else c.sendObjectBackwards(obj);
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
      const objs = c.getActiveObjects();
      if (!objs.length) return;
      c.discardActiveObject();
      for (const o of objs) {
        const br = o.getBoundingRect();
        const dx = (o.left ?? 0) - br.left;
        const dy = (o.top ?? 0) - br.top;
        switch (kind) {
          case "left":
            o.set({ left: dx });
            break;
          case "center-h":
            o.set({ left: (CANVAS_W - br.width) / 2 + dx });
            break;
          case "right":
            o.set({ left: CANVAS_W - br.width + dx });
            break;
          case "top":
            o.set({ top: dy });
            break;
          case "center-v":
            o.set({ top: (CANVAS_H - br.height) / 2 + dy });
            break;
          case "bottom":
            o.set({ top: CANVAS_H - br.height + dy });
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
      const obj = c?.getActiveObject();
      if (!c || !obj) return;
      if (axis === "x") obj.set({ flipX: !obj.flipX });
      else obj.set({ flipY: !obj.flipY });
      c.requestRenderAll();
      snapshot();
      bump();
    },
    [bump, snapshot],
  );

  const toggleLock = useCallback(() => {
    const c = canvasRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj) return;
    const locked = !(obj as unknown as { gpLocked?: boolean }).gpLocked;
    setProp(obj, "gpLocked", locked);
    obj.set({
      lockMovementX: locked,
      lockMovementY: locked,
      lockScalingX: locked,
      lockScalingY: locked,
      lockRotation: locked,
      hasControls: !locked,
    });
    c.requestRenderAll();
    bump();
  }, [bump]);

  const toggleVisible = useCallback(
    (obj: fabric.Object) => {
      const c = canvasRef.current;
      if (!c) return;
      obj.set({ visible: !obj.visible });
      c.requestRenderAll();
      bump();
    },
    [bump],
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

  const restore = useCallback(
    (json: string) => {
      const c = canvasRef.current;
      if (!c || !json) return;
      restoring.current = true;
      void c.loadFromJSON(JSON.parse(json)).then(() => {
        c.requestRenderAll();
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
      const z = Math.min(cw / CANVAS_W, ch / CANVAS_H);
      applyZoom(Math.max(0.05, z * 0.95));
    },
    [applyZoom],
  );

  const newDesign = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.clear();
    c.backgroundColor = "#ffffff";
    c.requestRenderAll();
    undoStack.current = [JSON.stringify(c.toObject([...CUSTOM_PROPS]))];
    redoStack.current = [];
    refreshHistoryFlags();
    bump();
  }, [bump, refreshHistoryFlags]);

  const loadScene = useCallback(
    async (scene: FabricScene) => {
      const c = canvasRef.current;
      if (!c) return;
      restoring.current = true;
      await c.loadFromJSON(scene);
      c.requestRenderAll();
      restoring.current = false;
      undoStack.current = [JSON.stringify(c.toObject([...CUSTOM_PROPS]))];
      redoStack.current = [];
      refreshHistoryFlags();
      bump();
    },
    [bump, refreshHistoryFlags],
  );

  const exportScene = useCallback((): FabricScene => {
    const c = canvasRef.current;
    if (!c) return { objects: [] };
    return c.toObject([...CUSTOM_PROPS]) as unknown as FabricScene;
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
      if (typing || editingText) return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        void duplicateSelected();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, duplicateSelected, deleteSelected]);

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
    undo,
    redo,
    setZoom: applyZoom,
    zoomIn,
    zoomOut,
    fitTo,
    newDesign,
    loadScene,
    exportScene,
  };
}
