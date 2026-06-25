import * as fabric from "fabric";

const SNAP_THRESHOLD = 6;
const GUIDE_COLOR = "#ff6600";

type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

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

function movingSet(target: fabric.FabricObject): Set<fabric.FabricObject> {
  if (target.type === "activeselection") {
    return new Set((target as fabric.ActiveSelection).getObjects());
  }
  return new Set([target]);
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

/** Smart alignment guides while dragging objects on the page. */
export function attachSnapGuides(
  canvas: fabric.Canvas,
  getPageSize: () => { w: number; h: number },
): () => void {
  let verticalGuides: number[] = [];
  let horizontalGuides: number[] = [];

  const clearGuides = () => {
    verticalGuides = [];
    horizontalGuides = [];
  };

  const onMoving = (e: { target?: fabric.FabricObject }) => {
    const target = e.target;
    if (!target) return;

    clearGuides();

    const { w: pageW, h: pageH } = getPageSize();
    const moving = movingSet(target);
    const { vertical, horizontal } = collectTargets(canvas, moving, pageW, pageH);
    const b = boundsOf(target);

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
  };

  const onAfterRender = (opt: { ctx: CanvasRenderingContext2D }) => {
    const { w, h } = getPageSize();
    drawGuides(opt.ctx, canvas, w, h, verticalGuides, horizontalGuides);
  };

  const onEnd = () => {
    clearGuides();
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
    clearGuides();
  };
}
