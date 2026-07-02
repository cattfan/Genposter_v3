import * as fabric from "fabric";

import { getObjectGroupId } from "./dataGroups.js";

const SNAP_THRESHOLD = 6;
const GUIDE_COLOR = "#ff6600";
const HULL_COLOR = "#339af0";
const HULL_FILL = "rgba(51, 154, 240, 0.08)";

type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

type Rect = { left: number; top: number; width: number; height: number };

type AxisSnap = { delta: number; guide: number };

function boundsOf(obj: fabric.FabricObject): Bounds {
  const r = obj.getBoundingRect();
  return {
    left: r.left,
    top: r.top,
    right: r.left + r.width,
    bottom: r.top + r.height,
    centerX: r.left + r.width / 2,
    centerY: r.top + r.height / 2,
  };
}

function unionRect(objects: Iterable<fabric.FabricObject>): Rect | null {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const obj of objects) {
    const b = boundsOf(obj);
    left = Math.min(left, b.left);
    top = Math.min(top, b.top);
    right = Math.max(right, b.right);
    bottom = Math.max(bottom, b.bottom);
  }

  if (!Number.isFinite(left)) return null;
  return { left, top, width: right - left, height: bottom - top };
}

function movingSet(target: fabric.FabricObject): Set<fabric.FabricObject> {
  if (target.type === "activeselection") {
    return new Set((target as fabric.ActiveSelection).getObjects());
  }
  return new Set([target]);
}

function axisOverlap(a0: number, a1: number, b0: number, b1: number, margin = 0): boolean {
  return Math.max(a0, b0) <= Math.min(a1, b1) + margin;
}

function isEdgeAdjacent(a: Bounds, b: Bounds): boolean {
  const margin = SNAP_THRESHOLD;
  if (axisOverlap(a.left, a.right, b.left, b.right, margin)) {
    if (Math.abs(a.bottom - b.top) <= SNAP_THRESHOLD) return true;
    if (Math.abs(a.top - b.bottom) <= SNAP_THRESHOLD) return true;
  }
  if (axisOverlap(a.top, a.bottom, b.top, b.bottom, margin)) {
    if (Math.abs(a.right - b.left) <= SNAP_THRESHOLD) return true;
    if (Math.abs(a.left - b.right) <= SNAP_THRESHOLD) return true;
  }
  return false;
}

function findEdgeSnapX(moving: Bounds, other: Bounds): number | null {
  if (!axisOverlap(moving.top, moving.bottom, other.top, other.bottom)) return null;

  let best: number | null = null;
  let bestDist = SNAP_THRESHOLD + 1;
  for (const delta of [other.left - moving.right, other.right - moving.left]) {
    const dist = Math.abs(delta);
    if (dist <= SNAP_THRESHOLD && dist < bestDist) {
      bestDist = dist;
      best = delta;
    }
  }
  return best;
}

function findEdgeSnapY(moving: Bounds, other: Bounds): number | null {
  if (!axisOverlap(moving.left, moving.right, other.left, other.right)) return null;

  let best: number | null = null;
  let bestDist = SNAP_THRESHOLD + 1;
  for (const delta of [other.top - moving.bottom, other.bottom - moving.top]) {
    const dist = Math.abs(delta);
    if (dist <= SNAP_THRESHOLD && dist < bestDist) {
      bestDist = dist;
      best = delta;
    }
  }
  return best;
}

function buildStickyCluster(
  canvas: fabric.Canvas,
  moving: Set<fabric.FabricObject>,
): Set<fabric.FabricObject> {
  const cluster = new Set(moving);

  for (const obj of moving) {
    const groupId = getObjectGroupId(obj);
    if (!groupId) continue;
    for (const o of canvas.getObjects()) {
      if (o.visible && getObjectGroupId(o) === groupId) cluster.add(o);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const obj of canvas.getObjects()) {
      if (!obj.visible || cluster.has(obj)) continue;
      const b = boundsOf(obj);
      for (const member of cluster) {
        if (isEdgeAdjacent(b, boundsOf(member))) {
          cluster.add(obj);
          changed = true;
          break;
        }
      }
    }
  }

  return cluster;
}

function collectTargets(
  canvas: fabric.Canvas,
  moving: Set<fabric.FabricObject>,
  pageW: number,
  pageH: number,
): { vertical: number[]; horizontal: number[] } {
  const vertical = [0, pageW / 2, pageW];
  const horizontal = [0, pageH / 2, pageH];

  for (const obj of canvas.getObjects()) {
    if (!obj.visible || moving.has(obj)) continue;
    const b = boundsOf(obj);
    vertical.push(b.left, b.centerX, b.right);
    horizontal.push(b.top, b.centerY, b.bottom);
  }

  return { vertical, horizontal };
}

function findSnap(edges: number[], targets: number[]): AxisSnap | null {
  let best: AxisSnap | null = null;
  let bestDist = SNAP_THRESHOLD + 1;

  for (const edge of edges) {
    for (const target of targets) {
      const dist = Math.abs(edge - target);
      if (dist <= SNAP_THRESHOLD && dist < bestDist) {
        bestDist = dist;
        best = { delta: target - edge, guide: target };
      }
    }
  }

  return best;
}

function drawGuides(
  ctx: CanvasRenderingContext2D,
  canvas: fabric.Canvas,
  pageW: number,
  pageH: number,
  vertical: number[],
  horizontal: number[],
) {
  if (!vertical.length && !horizontal.length) return;

  const vpt = canvas.viewportTransform;
  if (!vpt) return;

  const zoom = canvas.getZoom();
  ctx.save();
  ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
  ctx.strokeStyle = GUIDE_COLOR;
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([4 / zoom, 4 / zoom]);

  for (const x of vertical) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, pageH);
    ctx.stroke();
  }
  for (const y of horizontal) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(pageW, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawStickyHull(
  ctx: CanvasRenderingContext2D,
  canvas: fabric.Canvas,
  hull: Rect | null,
) {
  if (!hull) return;

  const vpt = canvas.viewportTransform;
  if (!vpt) return;

  const zoom = canvas.getZoom();
  ctx.save();
  ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
  ctx.fillStyle = HULL_FILL;
  ctx.fillRect(hull.left, hull.top, hull.width, hull.height);
  ctx.strokeStyle = HULL_COLOR;
  ctx.lineWidth = 2 / zoom;
  ctx.setLineDash([]);
  ctx.strokeRect(hull.left, hull.top, hull.width, hull.height);
  ctx.restore();
}

/** Smart alignment guides + edge snap + sticky cluster hull while dragging. */
export function attachSnapGuides(
  canvas: fabric.Canvas,
  getPageSize: () => { w: number; h: number },
): () => void {
  let verticalGuides: number[] = [];
  let horizontalGuides: number[] = [];
  let stickyHull: Rect | null = null;

  const clearOverlay = () => {
    verticalGuides = [];
    horizontalGuides = [];
    stickyHull = null;
  };

  const onMoving = (e: { target?: fabric.FabricObject }) => {
    const target = e.target;
    if (!target) return;

    clearOverlay();

    const { w: pageW, h: pageH } = getPageSize();
    const moving = movingSet(target);
    const { vertical, horizontal } = collectTargets(canvas, moving, pageW, pageH);
    let b = boundsOf(target);

    const snapX = findSnap([b.left, b.centerX, b.right], vertical);
    const snapY = findSnap([b.top, b.centerY, b.bottom], horizontal);

    if (snapX) {
      target.set("left", (target.left ?? 0) + snapX.delta);
      verticalGuides.push(snapX.guide);
    }
    if (snapY) {
      target.set("top", (target.top ?? 0) + snapY.delta);
      horizontalGuides.push(snapY.guide);
    }

    target.setCoords();
    b = boundsOf(target);

    let edgeDx: number | null = null;
    let edgeDy: number | null = null;
    let edgeXDist = SNAP_THRESHOLD + 1;
    let edgeYDist = SNAP_THRESHOLD + 1;

    for (const obj of canvas.getObjects()) {
      if (!obj.visible || moving.has(obj)) continue;
      const other = boundsOf(obj);

      const dx = findEdgeSnapX(b, other);
      if (dx !== null && Math.abs(dx) < edgeXDist) {
        edgeXDist = Math.abs(dx);
        edgeDx = dx;
      }

      const dy = findEdgeSnapY(b, other);
      if (dy !== null && Math.abs(dy) < edgeYDist) {
        edgeYDist = Math.abs(dy);
        edgeDy = dy;
      }
    }

    if (edgeDx !== null) target.set("left", (target.left ?? 0) + edgeDx);
    if (edgeDy !== null) target.set("top", (target.top ?? 0) + edgeDy);
    target.setCoords();

    const cluster = buildStickyCluster(canvas, moving);
    if (cluster.size > 1) stickyHull = unionRect(cluster);
  };

  const onAfterRender = (opt: { ctx: CanvasRenderingContext2D }) => {
    const { w, h } = getPageSize();
    drawGuides(opt.ctx, canvas, w, h, verticalGuides, horizontalGuides);
    drawStickyHull(opt.ctx, canvas, stickyHull);
  };

  const onEnd = () => {
    clearOverlay();
    canvas.requestRenderAll();
  };

  canvas.on("object:moving", onMoving);
  canvas.on("after:render", onAfterRender);
  canvas.on("mouse:up", onEnd);
  canvas.on("object:modified", onEnd);

  return () => {
    canvas.off("object:moving", onMoving);
    canvas.off("after:render", onAfterRender);
    canvas.off("mouse:up", onEnd);
    canvas.off("object:modified", onEnd);
    clearOverlay();
  };
}
