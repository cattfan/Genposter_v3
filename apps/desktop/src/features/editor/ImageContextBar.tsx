import type * as fabric from "fabric";
import { Badge, Divider, Group, NumberInput, Tooltip, UnstyledButton } from "@mantine/core";
import { IconBorderRadius, IconFlipHorizontal, IconFlipVertical } from "@tabler/icons-react";

import { getStr } from "../../lib/fabric-util.js";
import { ContextBarQuickActions } from "./ContextBarQuickActions.js";
import { FormatPainterButton } from "./FormatPainterButton.js";
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

/** Context bar for images and photo slots (Ô ảnh). */
export function ImageContextBar({ ed, obj }: { ed: EditorApi; obj: fabric.Object }) {
  const up = (p: Record<string, unknown>) => ed.updateActive(p);
  const bind = getStr(obj, "gpBind") ?? "";
  const isSlot = bind.startsWith("photo:");

  return (
    <Group gap={6} wrap="nowrap" className="ctx-bar-row">
      {isSlot && (
        <Badge variant="light" color="riviu" size="lg" radius="sm">
          {getStr(obj, "gpLabel") || "Ô ảnh"}
        </Badge>
      )}

      <Tooltip label="Lật ngang" withArrow>
        <UnstyledButton
          className="ctx-bar-icon-btn"
          onClick={() => ed.flip("x")}
          aria-label="Lật ngang"
        >
          <IconFlipVertical size={18} stroke={1.5} />
        </UnstyledButton>
      </Tooltip>
      <Tooltip label="Lật dọc" withArrow>
        <UnstyledButton
          className="ctx-bar-icon-btn"
          onClick={() => ed.flip("y")}
          aria-label="Lật dọc"
        >
          <IconFlipHorizontal size={18} stroke={1.5} />
        </UnstyledButton>
      </Tooltip>

      <Tooltip label="Bo góc ảnh" withArrow>
        <NumberInput
          size="xs"
          w={96}
          min={0}
          value={num((obj as unknown as { gpCornerRadius?: number }).gpCornerRadius, 0)}
          onChange={(v) => up({ gpCornerRadius: toNum(v) })}
          leftSection={<IconBorderRadius size={15} />}
          aria-label="Bo góc ảnh"
          className="ctx-bar-num"
        />
      </Tooltip>

      <StrokePopover obj={obj} onPatch={up} />
      <OpacityPopover obj={obj} onPatch={up} />
      <PositionPopover ed={ed} />

      <Divider orientation="vertical" className="ctx-bar-divider" />
      <FormatPainterButton ed={ed} />
      <ContextBarQuickActions ed={ed} />
    </Group>
  );
}
