import { useState } from "react";
import * as fabric from "fabric";
import {
  ActionIcon,
  ColorInput,
  Popover,
  SimpleGrid,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";

import { BRAND_COLORS, PALETTE } from "./palette.js";

export function TextColorSwatch({
  text,
  onChange,
}: {
  text: fabric.Textbox;
  onChange: (c: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const fill = (text.fill as string) ?? "#1f1d1b";

  return (
    <Popover opened={open} onChange={setOpen} width={220} position="bottom" withArrow withinPortal>
      <Popover.Target>
        <UnstyledButton
          className="text-color-swatch"
          onClick={() => setOpen((o) => !o)}
          aria-label="Màu chữ"
        >
          <Text fw={700} size="lg" lh={1}>
            A
          </Text>
          <span className="text-color-bar" style={{ background: fill }} />
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Text size="xs" fw={600}>
            Màu chữ
          </Text>
          <SimpleGrid cols={5} spacing={6}>
            {BRAND_COLORS.map((c) => (
              <ActionIcon
                key={c.value}
                variant="default"
                size="md"
                aria-label={c.label}
                onClick={() => {
                  onChange(c.value);
                  setOpen(false);
                }}
                style={{
                  background: c.value,
                  border:
                    c.value.toLowerCase() === "#ffffff"
                      ? "1px solid var(--mantine-color-gray-4)"
                      : undefined,
                }}
              />
            ))}
          </SimpleGrid>
          <ColorInput
            size="xs"
            value={fill}
            onChange={(c) => onChange(c)}
            swatches={PALETTE}
            swatchesPerRow={8}
            format="hex"
          />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
