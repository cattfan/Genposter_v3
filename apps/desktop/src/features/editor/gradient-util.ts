import * as fabric from "fabric";

export interface GradientStop {
  offset: number;
  color: string;
}

export interface LinearGradientSpec {
  angle: number;
  stops: GradientStop[];
}

export function isGradientFill(fill: unknown): boolean {
  return Boolean(fill && typeof fill === "object" && (fill as { type?: string }).type === "linear");
}

export function parseLinearGradient(fill: unknown): LinearGradientSpec {
  if (!isGradientFill(fill)) {
    return {
      angle: 90,
      stops: [
        { offset: 0, color: "#ff6600" },
        { offset: 1, color: "#fff3eb" },
      ],
    };
  }
  const g = fill as fabric.Gradient<"linear", "linear">;
  const coords = g.coords ?? { x1: 0, y1: 0, x2: 0, y2: 1 };
  const dx = (coords.x2 ?? 0) - (coords.x1 ?? 0);
  const dy = (coords.y2 ?? 0) - (coords.y1 ?? 0);
  const angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 90);
  const stops = (g.colorStops ?? []).map((s) => ({
    offset: s.offset ?? 0,
    color: String(s.color ?? "#000000"),
  }));
  return {
    angle,
    stops: stops.length >= 2 ? stops : parseLinearGradient(null).stops,
  };
}

export function buildLinearGradient(
  spec: LinearGradientSpec,
  w = 1,
  h = 1,
) {
  const rad = ((spec.angle - 90) * Math.PI) / 180;
  const cx = w / 2;
  const cy = h / 2;
  const len = Math.max(w, h) / 2;
  return new fabric.Gradient({
    type: "linear",
    coords: {
      x1: cx - Math.cos(rad) * len,
      y1: cy - Math.sin(rad) * len,
      x2: cx + Math.cos(rad) * len,
      y2: cy + Math.sin(rad) * len,
    },
    colorStops: spec.stops.map((s) => ({ offset: s.offset, color: s.color })),
  });
}

export const GRADIENT_PRESETS: { id: string; label: string; spec: LinearGradientSpec }[] = [
  {
    id: "riviu",
    label: "Cam Riviu",
    spec: {
      angle: 135,
      stops: [
        { offset: 0, color: "#ff6600" },
        { offset: 1, color: "#fff3eb" },
      ],
    },
  },
  {
    id: "dark-overlay",
    label: "Overlay tối",
    spec: {
      angle: 180,
      stops: [
        { offset: 0, color: "rgba(0,0,0,0)" },
        { offset: 1, color: "rgba(0,0,0,0.65)" },
      ],
    },
  },
  {
    id: "sunset",
    label: "Hoàng hôn",
    spec: {
      angle: 90,
      stops: [
        { offset: 0, color: "#ffd2b3" },
        { offset: 0.5, color: "#ff6600" },
        { offset: 1, color: "#e65c00" },
      ],
    },
  },
];
