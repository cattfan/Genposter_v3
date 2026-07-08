import { useState } from "react";
import * as fabric from "fabric";
import { Popover, Text, UnstyledButton } from "@mantine/core";

import { ColorPalettePanel } from "./ColorPalettePanel.js";

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
    <Popover
      opened={open}
      onChange={setOpen}
      width={260}
      position="bottom"
      withArrow
      withinPortal
      shadow="md"
    >
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
        <ColorPalettePanel
          title="Màu chữ"
          value={fill}
          onChange={onChange}
          closeOnPick
          onClose={() => setOpen(false)}
        />
      </Popover.Dropdown>
    </Popover>
  );
}
