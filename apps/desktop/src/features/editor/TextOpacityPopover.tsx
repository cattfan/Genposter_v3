import type * as fabric from "fabric";
import { Popover, Slider, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconDropletHalf } from "@tabler/icons-react";

function num(v: unknown, d = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : d;
}

export function TextOpacityPopover({
  text,
  onPatch,
}: {
  text: fabric.Textbox;
  onPatch: (p: Record<string, unknown>) => void;
}) {
  const pct = num((text.opacity ?? 1) * 100, 100);

  return (
    <Popover width={220} position="bottom" withArrow withinPortal shadow="md">
      <Popover.Target>
        <UnstyledButton className="ctx-bar-icon-btn" aria-label="Độ trong suốt">
          <IconDropletHalf size={20} stroke={1.5} />
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Text size="xs" fw={600}>
            Độ trong suốt
          </Text>
          <Slider
            value={pct}
            onChange={(v) => onPatch({ opacity: v / 100 })}
            min={0}
            max={100}
            label={(v) => `${v}%`}
          />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
