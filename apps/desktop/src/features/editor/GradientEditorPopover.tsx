import { useState } from "react";
import type * as fabric from "fabric";
import {
  Button,
  NumberInput,
  Popover,
  SimpleGrid,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconGradienter } from "@tabler/icons-react";

import {
  GRADIENT_PRESETS,
  buildLinearGradient,
  isGradientFill,
  parseLinearGradient,
  type LinearGradientSpec,
} from "./gradient-util.js";
import { ColorPalettePanel } from "./ColorPalettePanel.js";

export function GradientEditorPopover({
  obj,
  onPatch,
}: {
  obj: fabric.Object;
  onPatch: (p: Record<string, unknown>) => void;
}) {
  const w = Math.max(1, obj.getScaledWidth());
  const h = Math.max(1, obj.getScaledHeight());
  const initial = parseLinearGradient(obj.fill);
  const [spec, setSpec] = useState<LinearGradientSpec>(initial);
  const active = isGradientFill(obj.fill);

  const apply = (next: LinearGradientSpec) => {
    setSpec(next);
    onPatch({ fill: buildLinearGradient(next, w, h) });
  };

  return (
    <Popover width={300} position="bottom" withArrow withinPortal shadow="md">
      <Popover.Target>
        <UnstyledButton
          className={`ctx-bar-pill${active ? " ctx-bar-pill--active" : ""}`}
          aria-label="Gradient"
        >
          <IconGradienter size={16} stroke={1.5} />
          <Text size="xs" fw={600}>
            Gradient
          </Text>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <SimpleGrid cols={3} spacing="xs">
            {GRADIENT_PRESETS.map((p) => (
              <Button key={p.id} size="xs" variant="light" onClick={() => apply(p.spec)}>
                {p.label}
              </Button>
            ))}
          </SimpleGrid>
          <NumberInput
            label="Góc (°)"
            size="xs"
            value={spec.angle}
            onChange={(v) =>
              apply({ ...spec, angle: typeof v === "number" ? v : spec.angle })
            }
          />
          <ColorPalettePanel
            title="Màu đầu"
            value={spec.stops[0]?.color ?? "#ff6600"}
            onChange={(c) =>
              apply({
                ...spec,
                stops: [{ ...spec.stops[0]!, color: c }, spec.stops[1]!],
              })
            }
          />
          <ColorPalettePanel
            title="Màu cuối"
            value={spec.stops[1]?.color ?? "#fff3eb"}
            onChange={(c) =>
              apply({
                ...spec,
                stops: [spec.stops[0]!, { ...spec.stops[1]!, color: c }],
              })
            }
          />
          <Button size="xs" variant="subtle" onClick={() => onPatch({ fill: "#ff6600" })}>
            Màu đặc
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
