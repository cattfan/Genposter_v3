import type { ReactNode } from "react";
import * as fabric from "fabric";
import {
  ActionIcon,
  ColorInput,
  Group,
  NumberInput,
  SegmentedControl,
  Tooltip,
} from "@mantine/core";
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconBold,
  IconItalic,
  IconUnderline,
} from "@tabler/icons-react";

import { FontFamilyCombobox } from "./FontFamilyCombobox.js";
import { PALETTE } from "./palette.js";
import type { EditorApi } from "./useEditor.js";

function num(v: unknown, d = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : d;
}
function toNum(v: number | string): number {
  return typeof v === "number" ? v : Number(v) || 0;
}

function IconBtn({
  label,
  onClick,
  children,
  active,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <Tooltip label={label} withArrow>
      <ActionIcon variant={active ? "filled" : "default"} size="lg" onClick={onClick}>
        {children}
      </ActionIcon>
    </Tooltip>
  );
}

export function TextContextBar({ ed, text }: { ed: EditorApi; text: fabric.Textbox }) {
  const up = (p: Record<string, unknown>) => ed.updateActive(p);
  const bold = Number(text.fontWeight ?? 400) >= 700;

  return (
    <Group gap="xs" wrap="nowrap" className="text-context-bar">
      <FontFamilyCombobox
        compact
        value={(text.fontFamily as string) ?? "Be Vietnam Pro"}
        ed={ed}
        onChange={(fontFamily) => up({ fontFamily })}
      />
      <NumberInput
        size="xs"
        w={72}
        min={1}
        value={num(text.fontSize, 40)}
        onChange={(v) => up({ fontSize: toNum(v) })}
        aria-label="Cỡ chữ"
      />
      <ActionIcon.Group>
        <IconBtn
          label="Đậm"
          active={bold}
          onClick={() => up({ fontWeight: bold ? "400" : "700" })}
        >
          <IconBold size={18} />
        </IconBtn>
        <IconBtn
          label="Nghiêng"
          active={text.fontStyle === "italic"}
          onClick={() =>
            up({ fontStyle: text.fontStyle === "italic" ? "normal" : "italic" })
          }
        >
          <IconItalic size={18} />
        </IconBtn>
        <IconBtn
          label="Gạch chân"
          active={Boolean(text.underline)}
          onClick={() => up({ underline: !text.underline })}
        >
          <IconUnderline size={18} />
        </IconBtn>
      </ActionIcon.Group>
      <ColorInput
        size="xs"
        w={120}
        value={(text.fill as string) ?? "#1f1d1b"}
        onChange={(c) => up({ fill: c })}
        swatches={PALETTE}
        swatchesPerRow={8}
        format="hex"
        aria-label="Màu chữ"
      />
      <SegmentedControl
        size="xs"
        value={(text.textAlign as string) ?? "left"}
        onChange={(v) => up({ textAlign: v })}
        data={[
          { value: "left", label: <IconAlignLeft size={16} /> },
          { value: "center", label: <IconAlignCenter size={16} /> },
          { value: "right", label: <IconAlignRight size={16} /> },
        ]}
      />
    </Group>
  );
}
