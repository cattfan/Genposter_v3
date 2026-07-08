import type * as fabric from "fabric";
import {
  Divider,
  Group,
  NumberInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconBorderRadius, IconLineHeight } from "@tabler/icons-react";

import { ColorPickerPopover } from "./ColorPickerPopover.js";
import { ContextBarQuickActions } from "./ContextBarQuickActions.js";
import { FormatPainterButton } from "./FormatPainterButton.js";
import { GradientEditorPopover } from "./GradientEditorPopover.js";
import { isGradientFill } from "./gradient-util.js";
import { OpacityPopover } from "./OpacityPopover.js";
import { PositionPopover } from "./PositionPopover.js";
import { StrokePopover } from "./StrokePopover.js";
import type { EditorApi } from "./useEditor.js";

function num(v: unknown, d = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : d;
}
function toNum(v: number | string): number {
  return typeof v === "number" ? v : Number(v) || 0;
}

/** Context bar for rectangles, circles and lines. */
export function ShapeContextBar({ ed, obj }: { ed: EditorApi; obj: fabric.Object }) {
  const up = (p: Record<string, unknown>) => ed.updateActive(p);
  const isRect = obj.type === "rect";
  const isLine = obj.type === "line";
  const fillVal = obj.fill;
  const solidFill = typeof fillVal === "string" ? fillVal : "#ff6600";
  const color = (isLine ? (obj.stroke as string) : solidFill) ?? "#ff6600";
  const colorLabel = isLine ? "Màu đường kẻ" : "Màu hình";

  return (
    <Group gap={6} wrap="nowrap" className="ctx-bar-row">
      {!isLine && (
        <>
          <ColorPickerPopover
            title={colorLabel}
            value={color}
            onChange={(c) => up({ fill: c })}
            trigger={
              <UnstyledButton className="shape-color-swatch" aria-label={colorLabel} title={colorLabel}>
                <span
                  className="shape-color-swatch__chip"
                  style={{
                    background: isGradientFill(fillVal) ? "linear-gradient(135deg,#ff6600,#fff3eb)" : color,
                  }}
                />
              </UnstyledButton>
            }
          />
          <GradientEditorPopover obj={obj} onPatch={up} />
        </>
      )}

      {isLine && (
        <ColorPickerPopover
          title={colorLabel}
          value={color}
          onChange={(c) => up({ stroke: c })}
          trigger={
            <UnstyledButton className="shape-color-swatch" aria-label={colorLabel} title={colorLabel}>
              <span className="shape-color-swatch__chip" style={{ background: color }} />
            </UnstyledButton>
          }
        />
      )}

      {isRect && (
        <Tooltip label="Bo góc" withArrow>
          <NumberInput
            size="xs"
            w={96}
            min={0}
            value={num((obj as fabric.Rect).rx, 0)}
            onChange={(v) => up({ rx: toNum(v), ry: toNum(v) })}
            leftSection={<IconBorderRadius size={15} />}
            aria-label="Bo góc"
            className="ctx-bar-num"
          />
        </Tooltip>
      )}

      {isLine ? (
        <Tooltip label="Độ dày" withArrow>
          <NumberInput
            size="xs"
            w={96}
            min={1}
            value={num(obj.strokeWidth, 1)}
            onChange={(v) => up({ strokeWidth: Math.max(1, toNum(v)) })}
            leftSection={<IconLineHeight size={15} />}
            aria-label="Độ dày"
            className="ctx-bar-num"
          />
        </Tooltip>
      ) : (
        <StrokePopover obj={obj} onPatch={up} />
      )}

      <OpacityPopover obj={obj} onPatch={up} />
      <PositionPopover ed={ed} />

      <Divider orientation="vertical" className="ctx-bar-divider" />
      <FormatPainterButton ed={ed} />
      <ContextBarQuickActions ed={ed} />
    </Group>
  );
}
