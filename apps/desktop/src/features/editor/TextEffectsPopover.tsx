import { useState } from "react";
import type * as fabric from "fabric";
import {
  Button,
  Popover,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconWand } from "@tabler/icons-react";

import { TEXT_EFFECT_PRESETS, applyTextEffectPreset } from "./textEffectPresets.js";

function num(v: unknown, d = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : d;
}

export function TextEffectsPopover({
  text,
  onPatch,
}: {
  text: fabric.Textbox;
  onPatch: (p: Record<string, unknown>) => void;
}) {
  const [presetId, setPresetId] = useState("none");
  const strokeW = num(text.strokeWidth, 0);

  const apply = (id: string, thickness?: number) => {
    const preset = TEXT_EFFECT_PRESETS.find((p) => p.id === id) ?? TEXT_EFFECT_PRESETS[0]!;
    setPresetId(id);
    onPatch(applyTextEffectPreset(preset, thickness));
  };

  return (
    <Popover width={280} position="bottom" withArrow withinPortal shadow="md">
      <Popover.Target>
        <UnstyledButton className="ctx-bar-pill ctx-bar-pill--effects" aria-label="Hiệu ứng">
          <IconWand size={16} stroke={1.5} />
          <Text size="xs" fw={600}>
            Hiệu ứng
          </Text>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <SimpleGrid cols={2} spacing="xs">
            {TEXT_EFFECT_PRESETS.map((p) => (
              <Button
                key={p.id}
                variant={presetId === p.id ? "filled" : "light"}
                color={presetId === p.id ? "riviu" : "gray"}
                size="xs"
                onClick={() => apply(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </SimpleGrid>
          {strokeW > 0 && (
            <>
              <Text size="xs" fw={600}>
                Độ dày viền
              </Text>
              <Slider
                value={strokeW}
                onChange={(v) => apply(presetId, v)}
                min={0}
                max={20}
                label={(v) => String(v)}
              />
            </>
          )}
          <Button variant="subtle" color="gray" size="xs" onClick={() => apply("none")}>
            Xóa hiệu ứng
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
