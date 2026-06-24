import { useMemo, useState, type ReactNode } from "react";
import * as fabric from "fabric";
import {
  Accordion,
  ActionIcon,
  Badge,
  ColorInput,
  Combobox,
  Group,
  InputBase,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Textarea,
  Tooltip,
  useCombobox,
} from "@mantine/core";
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconArrowsMove,
  IconBorderStyle2,
  IconItalic,
  IconLetterCase,
  IconPhoto,
  IconShape,
  IconTypography,
  IconUnderline,
} from "@tabler/icons-react";

import {
  availableFamilies,
  getFontPreviewStyle,
  type FontFamilyOption,
} from "../../lib/fonts.js";
import { isImageType, isTextType } from "../../lib/fabric-util.js";
import type { EditorApi } from "./useEditor.js";
import { PALETTE } from "./palette.js";

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
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip label={label} withArrow>
      <ActionIcon
        variant={active ? "filled" : "default"}
        size="lg"
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  );
}

function PanelShell({
  embedded,
  children,
}: {
  embedded?: boolean;
  children: ReactNode;
}) {
  if (embedded) return children;
  return <aside className="panel right">{children}</aside>;
}

function TierBadge({ tier }: { tier: FontFamilyOption["tier"] }) {
  const badge = (
    <Badge size="xs" variant="light" color={tier === "C" ? "orange" : "gray"}>
      {tier}
    </Badge>
  );
  if (tier === "C") {
    return (
      <Tooltip label="Nên dùng cho cụm ngắn" withArrow>
        <span>{badge}</span>
      </Tooltip>
    );
  }
  return badge;
}

function FontFamilyCombobox({
  value,
  ed,
  onChange,
}: {
  value: string;
  ed: EditorApi;
  onChange: (fontFamily: string) => void;
}) {
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch("");
    },
  });
  const [search, setSearch] = useState("");
  const families = availableFamilies();
  const q = search.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      q
        ? families.filter(
            (f) =>
              f.label.toLowerCase().includes(q) ||
              f.group.toLowerCase().includes(q),
          )
        : families,
    [families, q],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, FontFamilyOption[]>();
    for (const f of filtered) {
      const items = map.get(f.group) ?? [];
      items.push(f);
      map.set(f.group, items);
    }
    return map;
  }, [filtered]);

  return (
    <Combobox
      store={combobox}
      withinPortal
      onOptionSubmit={async (v) => {
        onChange(v);
        try {
          await document.fonts.load(`16px "${v}"`);
        } catch {
          // ignore font load failures
        }
        ed.getCanvas()?.requestRenderAll();
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          label="Font"
          component="button"
          type="button"
          pointer
          rightSection={<Combobox.Chevron />}
          onClick={() => combobox.toggleDropdown()}
          rightSectionPointerEvents="none"
        >
          <Text style={getFontPreviewStyle(value)} size="sm">
            {value}
          </Text>
        </InputBase>
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Search
          placeholder="Tìm font…"
          value={search}
          onChange={(e) => {
            combobox.updateSelectedOptionIndex();
            setSearch(e.currentTarget.value);
          }}
        />
        <Combobox.Options mah={280} style={{ overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <Combobox.Empty>Không tìm thấy font</Combobox.Empty>
          ) : (
            Array.from(grouped.entries()).map(([group, items]) => (
              <Combobox.Group label={group} key={group}>
                {items.map((f) => (
                  <Combobox.Option value={f.value} key={f.value}>
                    <Group justify="space-between" wrap="nowrap" gap="xs">
                      <Text style={getFontPreviewStyle(f.value)} size="sm" truncate>
                        {f.label}
                      </Text>
                      <TierBadge tier={f.tier} />
                    </Group>
                  </Combobox.Option>
                ))}
              </Combobox.Group>
            ))
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

export function PropertiesPanel({
  ed,
  embedded,
}: {
  ed: EditorApi;
  embedded?: boolean;
}) {
  void ed.tick; // re-render on changes
  const obj = ed.getActive();

  if (!obj) {
    return (
      <PanelShell embedded={embedded}>
        <div className="empty-hint">
          Chọn một đối tượng trên canvas để chỉnh thuộc tính.
          <br />
          <br />
          Mẹo: Ctrl+D nhân bản, Delete để xóa, Ctrl+Z/Y hoàn tác.
        </div>
      </PanelShell>
    );
  }

  const isText = isTextType(obj);
  const isImg = isImageType(obj);
  const isRect = obj.type === "rect";
  const isShape = isRect || obj.type === "circle" || obj.type === "line";
  const t = obj as fabric.Textbox;

  const up = (p: Record<string, unknown>) => ed.updateActive(p);

  return (
    <PanelShell embedded={embedded}>
      <Accordion
        multiple
        defaultValue={["geometry", "text", "shape", "stroke"]}
        variant="separated"
        styles={{ content: { padding: "8px 10px 12px" }, label: { padding: "8px 0" } }}
      >
        <Accordion.Item value="geometry">
          <Accordion.Control icon={<IconArrowsMove size={18} />}>
            Vị trí & kích thước
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <SimpleGrid cols={2} spacing="xs">
                <NumberInput
                  label="X"
                  value={num(obj.left)}
                  onChange={(v) => up({ left: toNum(v) })}
                />
                <NumberInput
                  label="Y"
                  value={num(obj.top)}
                  onChange={(v) => up({ top: toNum(v) })}
                />
                <NumberInput
                  label="Rộng"
                  value={num(obj.getScaledWidth())}
                  onChange={(v) => ed.setActiveSize(toNum(v), undefined)}
                />
                <NumberInput
                  label="Cao"
                  value={num(obj.getScaledHeight())}
                  onChange={(v) => ed.setActiveSize(undefined, toNum(v))}
                />
                <NumberInput
                  label="Góc xoay"
                  value={num(obj.angle)}
                  onChange={(v) => up({ angle: toNum(v) })}
                />
              </SimpleGrid>
              <Text size="xs" fw={600} c="dimmed" mt={4}>
                Độ mờ: {num((obj.opacity ?? 1) * 100, 100)}%
              </Text>
              <Slider
                value={num((obj.opacity ?? 1) * 100, 100)}
                onChange={(v) => up({ opacity: v / 100 })}
                min={0}
                max={100}
                label={(v) => `${v}%`}
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {isText && (
          <Accordion.Item value="text">
            <Accordion.Control icon={<IconTypography size={18} />}>
              Văn bản
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <Textarea
                  label="Nội dung"
                  autosize
                  minRows={2}
                  maxRows={5}
                  value={t.text ?? ""}
                  onChange={(e) => up({ text: e.currentTarget.value })}
                />
                <FontFamilyCombobox
                  value={(t.fontFamily as string) ?? "Be Vietnam Pro"}
                  ed={ed}
                  onChange={(fontFamily) => up({ fontFamily })}
                />
                <SimpleGrid cols={2} spacing="xs">
                  <NumberInput
                    label="Cỡ chữ"
                    value={num(t.fontSize, 40)}
                    min={1}
                    onChange={(v) => up({ fontSize: toNum(v) })}
                  />
                  <Select
                    label="Đậm"
                    value={String(t.fontWeight ?? "400")}
                    onChange={(v) => v && up({ fontWeight: v })}
                    allowDeselect={false}
                    data={[
                      { value: "400", label: "Thường" },
                      { value: "500", label: "Medium" },
                      { value: "600", label: "SemiBold" },
                      { value: "700", label: "Bold" },
                      { value: "800", label: "ExtraBold" },
                    ]}
                  />
                </SimpleGrid>
                <Group justify="space-between" gap="xs">
                  <SegmentedControl
                    value={(t.textAlign as string) ?? "left"}
                    onChange={(v) => up({ textAlign: v })}
                    data={[
                      { value: "left", label: <IconAlignLeft size={16} /> },
                      { value: "center", label: <IconAlignCenter size={16} /> },
                      { value: "right", label: <IconAlignRight size={16} /> },
                    ]}
                  />
                  <ActionIcon.Group>
                    <IconBtn
                      label="Nghiêng"
                      active={t.fontStyle === "italic"}
                      onClick={() =>
                        up({ fontStyle: t.fontStyle === "italic" ? "normal" : "italic" })
                      }
                    >
                      <IconItalic size={18} />
                    </IconBtn>
                    <IconBtn
                      label="Gạch chân"
                      active={Boolean(t.underline)}
                      onClick={() => up({ underline: !t.underline })}
                    >
                      <IconUnderline size={18} />
                    </IconBtn>
                    <IconBtn
                      label="VIẾT HOA"
                      onClick={() => up({ text: (t.text ?? "").toUpperCase() })}
                    >
                      <IconLetterCase size={18} />
                    </IconBtn>
                  </ActionIcon.Group>
                </Group>
                <SimpleGrid cols={2} spacing="xs">
                  <NumberInput
                    label="Giãn dòng"
                    step={0.1}
                    decimalScale={2}
                    value={t.lineHeight ?? 1.16}
                    onChange={(v) => up({ lineHeight: toNum(v) })}
                  />
                  <NumberInput
                    label="Giãn chữ"
                    value={num(t.charSpacing, 0)}
                    onChange={(v) => up({ charSpacing: toNum(v) })}
                  />
                </SimpleGrid>
                <ColorInput
                  label="Màu chữ"
                  value={(t.fill as string) ?? "#1f1d1b"}
                  onChange={(c) => up({ fill: c })}
                  swatches={PALETTE}
                  swatchesPerRow={8}
                  format="hex"
                />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        )}

        {isShape && (
          <Accordion.Item value="shape">
            <Accordion.Control icon={<IconShape size={18} />}>
              Hình
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <ColorInput
                  label="Màu nền"
                  value={(obj.fill as string) ?? "#ff6600"}
                  onChange={(c) => up({ fill: c })}
                  swatches={PALETTE}
                  swatchesPerRow={8}
                  format="hex"
                />
                {isRect && (
                  <NumberInput
                    label="Bo góc"
                    value={num((obj as fabric.Rect).rx, 0)}
                    min={0}
                    onChange={(v) => up({ rx: toNum(v), ry: toNum(v) })}
                  />
                )}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        )}

        {isImg && (
          <Accordion.Item value="image">
            <Accordion.Control icon={<IconPhoto size={18} />}>
              Ảnh
            </Accordion.Control>
            <Accordion.Panel>
              <Text c="dimmed" size="xs">
                Dùng tab “Dữ liệu” để gán ô ảnh này thành slot ảnh (sẽ thay ở bước
                Tạo ảnh).
              </Text>
            </Accordion.Panel>
          </Accordion.Item>
        )}

        <Accordion.Item value="stroke">
          <Accordion.Control icon={<IconBorderStyle2 size={18} />}>
            Viền
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <NumberInput
                label="Độ dày"
                value={num(obj.strokeWidth, 0)}
                min={0}
                onChange={(v) => up({ strokeWidth: toNum(v) })}
              />
              <ColorInput
                label="Màu viền"
                value={(obj.stroke as string) ?? "#000000"}
                onChange={(c) => up({ stroke: c })}
                swatches={PALETTE}
                swatchesPerRow={8}
                format="hex"
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </PanelShell>
  );
}
