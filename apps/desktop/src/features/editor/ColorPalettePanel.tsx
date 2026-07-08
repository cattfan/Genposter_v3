import { ColorInput, Stack, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import { BRAND_COLORS, PALETTE } from "./palette.js";

function normHex(c: string): string {
  return c.trim().toLowerCase();
}

function PaletteSwatch({
  color,
  label,
  selected,
  onPick,
}: {
  color: string;
  label: string;
  selected: boolean;
  onPick: () => void;
}) {
  const isWhite = normHex(color) === "#ffffff";
  return (
    <button
      type="button"
      className={`color-palette__swatch${selected ? " color-palette__swatch--selected" : ""}`}
      style={{
        background: color,
        border: isWhite ? "1px solid var(--mantine-color-gray-4)" : undefined,
      }}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={onPick}
    >
      {selected && <IconCheck size={14} stroke={2.5} className="color-palette__check" />}
    </button>
  );
}

/** Shared color palette: brand swatches, full palette grid, hex input. */
export function ColorPalettePanel({
  value,
  onChange,
  title,
  showHexInput = true,
  closeOnPick = false,
  onClose,
}: {
  value: string;
  onChange: (hex: string) => void;
  title?: string;
  showHexInput?: boolean;
  closeOnPick?: boolean;
  onClose?: () => void;
}) {
  const current = normHex(value);

  const pick = (hex: string) => {
    onChange(hex);
    if (closeOnPick) onClose?.();
  };

  return (
    <Stack gap="sm" className="color-palette">
      {title && (
        <Text size="sm" fw={600}>
          {title}
        </Text>
      )}

      <div className="color-palette__section">
        <Text size="xs" c="dimmed" mb={6}>
          Thương hiệu
        </Text>
        <div className="color-palette__grid color-palette__grid--brand">
          {BRAND_COLORS.map((c) => (
            <PaletteSwatch
              key={c.value}
              color={c.value}
              label={c.label}
              selected={current === normHex(c.value)}
              onPick={() => pick(c.value)}
            />
          ))}
        </div>
      </div>

      <div className="color-palette__section">
        <Text size="xs" c="dimmed" mb={6}>
          Bảng màu
        </Text>
        <div className="color-palette__grid">
          {PALETTE.map((c) => (
            <PaletteSwatch
              key={c}
              color={c}
              label={c}
              selected={current === normHex(c)}
              onPick={() => pick(c)}
            />
          ))}
        </div>
      </div>

      {showHexInput && (
        <ColorInput
          label="Tuỳ chọn"
          size="xs"
          value={value}
          onChange={(c) => onChange(c)}
          format="hex"
          withPicker={false}
          swatches={[]}
        />
      )}
    </Stack>
  );
}
