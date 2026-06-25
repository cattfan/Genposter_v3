import type * as fabric from "fabric";
import {
  Popover,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconLineHeight } from "@tabler/icons-react";

function num(v: unknown, d = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : d;
}

export function TextSpacingPopover({
  text,
  onPatch,
}: {
  text: fabric.Textbox;
  onPatch: (p: Record<string, unknown>) => void;
}) {
  const originY = (text.originY as string) ?? "top";

  return (
    <Popover width={260} position="bottom" withArrow withinPortal shadow="md">
      <Popover.Target>
        <UnstyledButton className="ctx-bar-icon-btn" aria-label="Khoảng cách">
          <IconLineHeight size={20} stroke={1.5} />
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Text size="xs" fw={600}>
            Giãn cách chữ
          </Text>
          <Slider
            value={num(text.charSpacing, 0)}
            onChange={(v) => onPatch({ charSpacing: v })}
            min={-50}
            max={200}
            label={(v) => String(v)}
          />
          <Text size="xs" fw={600}>
            Khoảng cách dòng
          </Text>
          <Slider
            value={num(text.lineHeight, 1.16)}
            onChange={(v) => onPatch({ lineHeight: v })}
            min={0.8}
            max={2.5}
            step={0.05}
            label={(v) => v.toFixed(2)}
          />
          <Text size="xs" fw={600}>
            Neo ô văn bản
          </Text>
          <SegmentedControl
            size="xs"
            fullWidth
            value={originY}
            onChange={(v) => onPatch({ originY: v })}
            data={[
              { value: "top", label: "Trên" },
              { value: "center", label: "Giữa" },
              { value: "bottom", label: "Dưới" },
            ]}
          />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
