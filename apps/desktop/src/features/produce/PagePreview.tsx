import type { CSSProperties } from "react";

import type { PagePreviewData } from "./page-preview.js";

/** Palette used to tint data-group members consistently on preview + panel. */
export const GROUP_COLORS = [
  "#f76707",
  "#1c7ed6",
  "#37b24d",
  "#ae3ec9",
  "#e64980",
  "#0ca678",
];

export function groupColorMap(groupIds: string[]): Record<string, string> {
  const m: Record<string, string> = {};
  groupIds.forEach((id, i) => {
    m[id] = GROUP_COLORS[i % GROUP_COLORS.length]!;
  });
  return m;
}

function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const ORANGE = "#ff6600";
const BLUE = "#339af0";
const GRAY = "rgba(120, 120, 120, 0.35)";

/**
 * Page snapshot with clickable hotspots over every bindable element.
 * Hover/click is synced with the bindings table; data-group members share
 * one color so grouped data reads at a glance.
 */
export function PagePreview({
  data,
  bound,
  hoverId,
  activeId,
  hoverGroupId = null,
  groupColors = {},
  onHover,
  onSelect,
}: {
  data: PagePreviewData;
  /** elementIds that currently have a binding set. */
  bound: Set<string>;
  hoverId: string | null;
  activeId: string | null;
  /** Data group hovered in the bindings panel — highlights the whole cluster. */
  hoverGroupId?: string | null;
  groupColors?: Record<string, string>;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="page-preview-frame">
      <img src={data.img} alt="" draggable={false} />
      {data.boxes.map((b) => {
        const groupColor = b.dataGroupId ? groupColors[b.dataGroupId] : undefined;
        const isActive = activeId === b.id;
        const isHover =
          hoverId === b.id || (Boolean(b.dataGroupId) && hoverGroupId === b.dataGroupId);
        const isBound = bound.has(b.id);

        const baseColor = groupColor ?? (isBound ? ORANGE : GRAY);
        const style: CSSProperties = {
          left: `${b.left * 100}%`,
          top: `${b.top * 100}%`,
          width: `${b.width * 100}%`,
          height: `${b.height * 100}%`,
          borderStyle: groupColor || isBound || isActive || isHover ? "solid" : "dashed",
          borderColor: isActive ? ORANGE : isHover && !groupColor ? BLUE : baseColor,
          borderWidth: isActive || isHover ? 2 : 1.5,
          background: isHover
            ? rgba(groupColor ?? BLUE, 0.14)
            : groupColor
              ? rgba(groupColor, 0.05)
              : isBound
                ? rgba(ORANGE, 0.06)
                : undefined,
          boxShadow: isActive ? `0 0 0 2px ${rgba(ORANGE, 0.3)}` : undefined,
        };

        return (
          <div
            key={b.id}
            className="el-box"
            style={style}
            onMouseEnter={() => onHover(b.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(b.id)}
          />
        );
      })}
    </div>
  );
}
