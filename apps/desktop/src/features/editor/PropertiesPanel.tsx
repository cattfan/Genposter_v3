import { type ReactNode } from "react";
import * as fabric from "fabric";
import {
  Accordion,
  ActionIcon,
  ColorInput,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Textarea,
  Tooltip,
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
  IconBrush,
  IconClipboard,
} from "@tabler/icons-react";

import { isImageType, isTextType } from "../../lib/fabric-util.js";
import { getObjectGroupId } from "./dataGroups.js";
import { FontFamilyCombobox } from "./FontFamilyCombobox.js";
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
  const groupId = getObjectGroupId(obj);
  const group = groupId ? ed.getDataGroups().find((g) => g.id === groupId) : undefined;

  return (
    <PanelShell embedded={embedded}>
      <Group gap="xs" mb="sm">
        <Tooltip label="Sao chép style (Ctrl+C)" withArrow>
          <ActionIcon variant="default" size="lg" onClick={() => ed.copyStyle()}>
            <IconBrush size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Dán style (Ctrl+V)" withArrow>
          <ActionIcon
            variant="default"
            size="lg"
            disabled={!ed.canPasteStyle()}
            onClick={() => ed.pasteStyle()}
          >
            <IconClipboard size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
      {group && (
        <Stack gap="xs" mb="sm" p="xs" style={{ background: "var(--mantine-color-gray-0)", borderRadius: 8 }}>
          <Text size="xs" fw={600}>
            Nhóm dữ liệu: {group.label}
          </Text>
          <SegmentedControl
            size="xs"
            value={group.mode}
            onChange={(v) =>
              ed.updateDataGroup(group.id, { mode: v as "slot" | "repeat" })
            }
            data={[
              { value: "slot", label: "1 item" },
              { value: "repeat", label: "Lặp DS" },
            ]}
          />
          {group.mode === "slot" ? (
            <NumberInput
              size="xs"
              label="Item # trên slide"
              min={1}
              value={(group.itemIndex ?? 0) + 1}
              onChange={(v) =>
                ed.updateDataGroup(group.id, {
                  itemIndex: Math.max(0, (typeof v === "number" ? v : 1) - 1),
                })
              }
            />
          ) : (
            <SimpleGrid cols={3} spacing="xs">
              <NumberInput
                size="xs"
                label="Cao hàng"
                value={group.repeat?.rowHeight ?? 110}
                onChange={(v) =>
                  ed.updateDataGroup(group.id, {
                    repeat: {
                      rowHeight: typeof v === "number" ? v : 110,
                      gap: group.repeat?.gap ?? 8,
                      maxRows: group.repeat?.maxRows ?? 7,
                    },
                  })
                }
              />
              <NumberInput
                size="xs"
                label="Gap"
                value={group.repeat?.gap ?? 8}
                onChange={(v) =>
                  ed.updateDataGroup(group.id, {
                    repeat: {
                      rowHeight: group.repeat?.rowHeight ?? 110,
                      gap: typeof v === "number" ? v : 8,
                      maxRows: group.repeat?.maxRows ?? 7,
                    },
                  })
                }
              />
              <NumberInput
                size="xs"
                label="Max"
                value={group.repeat?.maxRows ?? 7}
                onChange={(v) =>
                  ed.updateDataGroup(group.id, {
                    repeat: {
                      rowHeight: group.repeat?.rowHeight ?? 110,
                      gap: group.repeat?.gap ?? 8,
                      maxRows: typeof v === "number" ? v : 7,
                    },
                  })
                }
              />
            </SimpleGrid>
          )}
        </Stack>
      )}
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
