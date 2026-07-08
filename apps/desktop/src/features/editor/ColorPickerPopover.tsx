import { useState, type ReactNode } from "react";
import { Popover } from "@mantine/core";

import { ColorPalettePanel } from "./ColorPalettePanel.js";

/** Popover wrapper around ColorPalettePanel for context-bar triggers. */
export function ColorPickerPopover({
  trigger,
  title,
  value,
  onChange,
  width = 260,
}: {
  trigger: ReactNode;
  title: string;
  value: string;
  onChange: (hex: string) => void;
  width?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      opened={open}
      onChange={setOpen}
      width={width}
      position="bottom"
      withArrow
      withinPortal
      shadow="md"
    >
      <Popover.Target>{trigger}</Popover.Target>
      <Popover.Dropdown>
        <ColorPalettePanel
          title={title}
          value={value}
          onChange={onChange}
          closeOnPick
          onClose={() => setOpen(false)}
        />
      </Popover.Dropdown>
    </Popover>
  );
}
