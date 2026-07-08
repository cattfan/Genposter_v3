import type { ReactNode } from "react";
import * as fabric from "fabric";
import { ActionIcon, Divider, Group, NumberInput, Tooltip, UnstyledButton } from "@mantine/core";
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconBold,
  IconItalic,
  IconLetterCase,
  IconMinus,
  IconPlus,
  IconStack2,
  IconStrikethrough,
  IconUnderline,
} from "@tabler/icons-react";

import { ContextBarQuickActions } from "./ContextBarQuickActions.js";
import { FontFamilyCombobox } from "./FontFamilyCombobox.js";
import { FormatPainterButton } from "./FormatPainterButton.js";
import { OpacityPopover } from "./OpacityPopover.js";
import { PositionPopover } from "./PositionPopover.js";
import { TextColorSwatch } from "./TextColorSwatch.js";
import { TextEffectsPopover } from "./TextEffectsPopover.js";
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
      <UnstyledButton
        className={`ctx-bar-icon-btn${active ? " ctx-bar-icon-btn--active" : ""}`}
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
      >
        {children}
      </UnstyledButton>
    </Tooltip>
  );
}

function isMostlyUpper(s: string): boolean {
  const letters = s.replace(/[^a-zA-ZÀ-ỹ]/g, "");
  if (!letters) return false;
  return letters === letters.toUpperCase() && letters !== letters.toLowerCase();
}

const ALIGNS: { value: string; label: string; icon: ReactNode }[] = [
  { value: "left", label: "Căn trái", icon: <IconAlignLeft size={18} /> },
  { value: "center", label: "Căn giữa", icon: <IconAlignCenter size={18} /> },
  { value: "right", label: "Căn phải", icon: <IconAlignRight size={18} /> },
];

export function TextContextBar({ ed, text }: { ed: EditorApi; text: fabric.Textbox }) {
  void ed.tick;
  const multi = ed.getActiveMany().length >= 2;
  const up = (p: Record<string, unknown>) => ed.updateActive(p);
  const bold = Number(text.fontWeight ?? 400) >= 700;
  const content = text.text ?? "";
  const upper = isMostlyUpper(content);
  const align = (text.textAlign as string) ?? "left";

  const stepSize = (delta: number) => {
    const cur = num(text.fontSize, 40);
    up({ fontSize: Math.max(1, cur + delta) });
  };

  const toggleCase = () => {
    if (!content) return;
    up({ text: upper ? content.toLowerCase() : content.toUpperCase() });
  };

  return (
    <Group gap={6} wrap="nowrap" className="ctx-bar-row">
      {multi && (
        <IconBtn label="Gom nhóm" onClick={() => ed.groupLayout()}>
          <IconStack2 size={18} />
        </IconBtn>
      )}
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
          variant="unstyled"
          styles={{ input: { textAlign: "center", padding: "0 4px" } }}
        />
        <ActionIcon variant="subtle" size="sm" onClick={() => stepSize(1)} aria-label="Tăng cỡ">
          <IconPlus size={14} />
        </ActionIcon>
      </Group>

      <TextColorSwatch text={text} onChange={(c) => up({ fill: c })} />

      <Group gap={2} wrap="nowrap">
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
        <IconBtn label="Chữ hoa" shortcut="Ctrl+Shift+K" active={upper} onClick={toggleCase}>
          <IconLetterCase size={18} />
        </IconBtn>
      </Group>

      <Group gap={2} wrap="nowrap">
        {ALIGNS.map((a) => (
          <IconBtn
            key={a.value}
            label={a.label}
            active={align === a.value}
            onClick={() => up({ textAlign: a.value })}
          >
            {a.icon}
          </IconBtn>
        ))}
      </Group>

      <TextSpacingPopover text={text} onPatch={up} />
      <OpacityPopover obj={text} onPatch={up} />
      <TextEffectsPopover text={text} onPatch={up} />
      <PositionPopover ed={ed} />

      <Divider orientation="vertical" className="ctx-bar-divider" />
      <FormatPainterButton ed={ed} />
      <ContextBarQuickActions ed={ed} />
    </Group>
  );
}
