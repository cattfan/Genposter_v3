import type { ReactNode } from "react";
import * as fabric from "fabric";
import {
  ActionIcon,
  Divider,
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
  IconLetterCase,
  IconMinus,
  IconPlus,
  IconStrikethrough,
  IconUnderline,
} from "@tabler/icons-react";

import { FontFamilyCombobox } from "./FontFamilyCombobox.js";
import { FormatPainterButton } from "./FormatPainterButton.js";
import { TextColorSwatch } from "./TextColorSwatch.js";
import { TextEffectsPopover } from "./TextEffectsPopover.js";
import { TextOpacityPopover } from "./TextOpacityPopover.js";
import { TextPositionPopover } from "./TextPositionPopover.js";
import { TextSpacingPopover } from "./TextSpacingPopover.js";
import type { EditorApi } from "./useEditor.js";

function num(v: unknown, d = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : d;
}
function toNum(v: number | string): number {
  return typeof v === "number" ? v : Number(v) || 0;
}

function IconBtn({
  label,
  shortcut,
  onClick,
  children,
  active,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
}) {
  const tip = shortcut ? `${label} (${shortcut})` : label;
  return (
    <Tooltip label={tip} withArrow>
      <ActionIcon variant={active ? "filled" : "default"} size="lg" onClick={onClick}>
        {children}
      </ActionIcon>
    </Tooltip>
  );
}

function isMostlyUpper(s: string): boolean {
  const letters = s.replace(/[^a-zA-ZÀ-ỹ]/g, "");
  if (!letters) return false;
  return letters === letters.toUpperCase() && letters !== letters.toLowerCase();
}

export function TextContextBar({ ed, text }: { ed: EditorApi; text: fabric.Textbox }) {
  const up = (p: Record<string, unknown>) => ed.updateActive(p);
  const bold = Number(text.fontWeight ?? 400) >= 700;
  const content = text.text ?? "";
  const upper = isMostlyUpper(content);

  const stepSize = (delta: number) => {
    const cur = num(text.fontSize, 40);
    up({ fontSize: Math.max(1, cur + delta) });
  };

  const toggleCase = () => {
    if (!content) return;
    up({ text: upper ? content.toLowerCase() : content.toUpperCase() });
  };

  return (
    <Group gap={6} wrap="nowrap" className="text-context-bar">
      <FontFamilyCombobox
        compact
        value={(text.fontFamily as string) ?? "Be Vietnam Pro"}
        ed={ed}
        onChange={(fontFamily) => up({ fontFamily })}
      />

      <Group gap={2} wrap="nowrap" className="ctx-bar-size-stepper">
        <ActionIcon variant="subtle" size="sm" onClick={() => stepSize(-1)} aria-label="Giảm cỡ">
          <IconMinus size={14} />
        </ActionIcon>
        <NumberInput
          size="xs"
          w={52}
          min={1}
          hideControls
          value={num(text.fontSize, 40)}
          onChange={(v) => up({ fontSize: toNum(v) })}
          aria-label="Cỡ chữ"
          styles={{ input: { textAlign: "center", padding: "0 4px" } }}
        />
        <ActionIcon variant="subtle" size="sm" onClick={() => stepSize(1)} aria-label="Tăng cỡ">
          <IconPlus size={14} />
        </ActionIcon>
      </Group>

      <TextColorSwatch text={text} onChange={(c) => up({ fill: c })} />

      <ActionIcon.Group>
        <IconBtn
          label="Đậm"
          shortcut="Ctrl+B"
          active={bold}
          onClick={() => up({ fontWeight: bold ? "400" : "700" })}
        >
          <IconBold size={18} />
        </IconBtn>
        <IconBtn
          label="Nghiêng"
          shortcut="Ctrl+I"
          active={text.fontStyle === "italic"}
          onClick={() => up({ fontStyle: text.fontStyle === "italic" ? "normal" : "italic" })}
        >
          <IconItalic size={18} />
        </IconBtn>
        <IconBtn
          label="Gạch chân"
          shortcut="Ctrl+U"
          active={Boolean(text.underline)}
          onClick={() => up({ underline: !text.underline })}
        >
          <IconUnderline size={18} />
        </IconBtn>
        <IconBtn
          label="Gạch ngang"
          shortcut="Ctrl+Shift+S"
          active={Boolean(text.linethrough)}
          onClick={() => up({ linethrough: !text.linethrough })}
        >
          <IconStrikethrough size={18} />
        </IconBtn>
        <IconBtn
          label="Chữ hoa"
          shortcut="Ctrl+Shift+K"
          active={upper}
          onClick={toggleCase}
        >
          <IconLetterCase size={18} />
        </IconBtn>
      </ActionIcon.Group>

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

      <TextSpacingPopover text={text} onPatch={up} />
      <TextOpacityPopover text={text} onPatch={up} />
      <TextEffectsPopover text={text} onPatch={up} />
      <TextPositionPopover ed={ed} />

      <Divider orientation="vertical" className="ctx-bar-divider" />
      <FormatPainterButton ed={ed} />
    </Group>
  );
}
