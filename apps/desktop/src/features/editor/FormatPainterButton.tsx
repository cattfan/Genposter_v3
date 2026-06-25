import { Tooltip, UnstyledButton } from "@mantine/core";
import { IconPaint } from "@tabler/icons-react";

import type { EditorApi } from "./useEditor.js";

export function FormatPainterButton({ ed }: { ed: EditorApi }) {
  void ed.tick;
  const armed = ed.isFormatPainterArmed();

  return (
    <Tooltip label="Sao chép định dạng (Ctrl+Alt+C)" withArrow>
      <UnstyledButton
        className={`ctx-bar-icon-btn${armed ? " ctx-bar-icon-btn--active" : ""}`}
        aria-label="Sao chép định dạng"
        aria-pressed={armed}
        onClick={() => {
          if (armed) ed.disarmFormatPainter();
          else ed.armFormatPainter();
        }}
      >
        <IconPaint size={20} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  );
}
