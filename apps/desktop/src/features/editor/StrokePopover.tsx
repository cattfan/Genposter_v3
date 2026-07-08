import type * as fabric from "fabric";
import { NumberInput, Popover, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconBorderStyle2 } from "@tabler/icons-react";

import { ColorPalettePanel } from "./ColorPalettePanel.js";

function num(v: unknown, d = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : d;
}
function toNum(v: number | string): number {
  return typeof v === "number" ? v : Number(v) || 0;
}

/** Stroke width + color control for the shape / image context bars. */
export function StrokePopover({
  obj,
  onPatch,
}: {
  obj: fabric.Object;
  onPatch: (p: Record<string, unknown>) => void;
}) {
  const stroke = (obj.stroke as string) ?? "#000000";

  return (
    <Popover width={260} position="bottom" withArrow withinPortal shadow="md">
      <Popover.Target>
        <UnstyledButton className="ctx-bar-pill" aria-label="Viền">
          <IconBorderStyle2 size={16} stroke={1.5} />
          <Text size="xs" fw={600}>
            Viền
          </Text>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <NumberInput
            label="Độ dày"
            size="xs"
            min={0}
            value={num(obj.strokeWidth, 0)}
            onChange={(v) => onPatch({ strokeWidth: Math.max(0, toNum(v)) })}
          />
          <ColorPalettePanel
            title="Màu viền"
            value={stroke}
            onChange={(c) => onPatch({ stroke: c })}
          />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
