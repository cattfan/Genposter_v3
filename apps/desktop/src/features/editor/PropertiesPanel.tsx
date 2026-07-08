import { type ReactNode } from "react";
import * as fabric from "fabric";
import {
  Accordion,
  ActionIcon,
  Button,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Textarea,
  TextInput,
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
  IconStack2,
  IconStrikethrough,
  IconTypography,
  IconUnderline,
  IconBrush,
  IconClipboard,
  IconDatabase,
  IconLayoutAlignBottom,
  IconLayoutAlignCenter,
  IconLayoutAlignLeft,
  IconLayoutAlignMiddle,
  IconLayoutAlignRight,
  IconLayoutAlignTop,
} from "@tabler/icons-react";

import { isImageType, isTextType } from "../../lib/fabric-util.js";
import { getObjectGroupId } from "./dataGroups.js";
import { FontFamilyCombobox } from "./FontFamilyCombobox.js";
import { ColorPalettePanel } from "./ColorPalettePanel.js";
import { DataBindingPanel } from "./DataBindingPanel.js";
import { FormatPainterButton } from "./FormatPainterButton.js";
import { LayersPanel } from "./LayersPanel.js";
import { GradientEditorPopover } from "./GradientEditorPopover.js";
import { isGradientFill } from "./gradient-util.js";
import { PositionPopover } from "./PositionPopover.js";
import { TextEffectsPopover } from "./TextEffectsPopover.js";
import { TextSpacingPopover } from "./TextSpacingPopover.js";
import type { EditorApi, AlignKind } from "./useEditor.js";

const PAGE_ALIGNS: { kind: AlignKind; label: string; icon: ReactNode }[] = [
  { kind: "left", label: "Căn trái", icon: <IconLayoutAlignLeft size={16} /> },
  { kind: "center-h", label: "Giữa ngang", icon: <IconLayoutAlignCenter size={16} /> },
  { kind: "right", label: "Căn phải", icon: <IconLayoutAlignRight size={16} /> },
  { kind: "top", label: "Căn trên", icon: <IconLayoutAlignTop size={16} /> },
  { kind: "center-v", label: "Giữa dọc", icon: <IconLayoutAlignMiddle size={16} /> },
  { kind: "bottom", label: "Căn dưới", icon: <IconLayoutAlignBottom size={16} /> },
];

function isMostlyUpper(s: string): boolean {
  const letters = s.replace(/[^a-zA-ZÀ-ỹ]/g, "");
  if (!letters) return false;
  return letters === letters.toUpperCase() && letters !== letters.toLowerCase();
}

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
  const many = ed.getActiveMany();
  const isMulti = many.length > 1;
  const pad = ed.getPasteboardPad();

  const allText = isMulti && many.every(isTextType);
  const allImg = isMulti && many.every(isImageType);
  const shapeTypes = new Set(["rect", "circle", "line"]);
  const allShape = isMulti && many.every((o) => shapeTypes.has(o.type ?? ""));

  const textObj =
    allText && many[0]
      ? (many[0] as fabric.Textbox)
      : !isMulti && obj && isTextType(obj)
        ? (obj as fabric.Textbox)
        : null;
  const isText = Boolean(textObj);
  const isImg = allImg || (obj ? isImageType(obj) : false);
  const isRect = obj?.type === "rect";
  const isShape =
    allShape || isRect || obj?.type === "circle" || obj?.type === "line";

  const up = (p: Record<string, unknown>) => ed.updateActive(p);
  const groupId = obj ? getObjectGroupId(obj) : undefined;
  const group = groupId ? ed.getDataGroups().find((g) => g.id === groupId) : undefined;

  const defaultSections = ["layers"];
  if (isMulti) defaultSections.push("multi");
  if (obj && !isMulti) defaultSections.push("geometry", "data");
  if (isText && textObj) defaultSections.push("text");
  if (isShape && !isMulti) defaultSections.push("shape");
  if (isImg && !isMulti) defaultSections.push("image");
  if (obj && !isMulti) defaultSections.push("stroke");

  return (
    <PanelShell embedded={embedded}>
      {obj && (
        <>
          <Group gap="xs" mb="sm">
            <Tooltip label="Sao chép thuộc tính (Ctrl+C)" withArrow>
              <ActionIcon
                variant="default"
                size="lg"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => ed.copyStyle()}
              >
                <IconBrush size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Dán thuộc tính (Ctrl+V)" withArrow>
              <ActionIcon
                variant="default"
                size="lg"
                disabled={!ed.canPasteStyle()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => ed.pasteStyle()}
              >
                <IconClipboard size={18} />
              </ActionIcon>
            </Tooltip>
            <FormatPainterButton ed={ed} />
          </Group>
          {group && (
            <Stack gap="xs" mb="sm" p="xs" style={{ background: "var(--mantine-color-gray-0)", borderRadius: 8 }}>
          <TextInput
            size="xs"
            label="Tên nhóm"
            value={group.label}
            onChange={(e) => ed.updateDataGroup(group.id, { label: e.currentTarget.value })}
          />
          <Button size="xs" variant="light" onClick={() => ed.selectDataGroupMembers(group.id)}>
            Chọn cả nhóm
          </Button>
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
                label="Khoảng cách"
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
                label="Tối đa"
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
        </>
      )}
      <Accordion
        multiple
        defaultValue={defaultSections}
        variant="separated"
        styles={{ content: { padding: "8px 10px 12px" }, label: { padding: "8px 0" } }}
      >
        <Accordion.Item value="layers">
          <Accordion.Control icon={<IconStack2 size={18} />}>Lớp</Accordion.Control>
          <Accordion.Panel>
            <LayersPanel ed={ed} />
          </Accordion.Panel>
        </Accordion.Item>

        {isMulti && (
          <Accordion.Item value="multi">
            <Accordion.Control icon={<IconStack2 size={18} />}>
              Nhiều đối tượng ({many.length})
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Button variant="light" leftSection={<IconStack2 size={16} />} onClick={() => ed.groupLayout()}>
                  Gom nhóm
                </Button>
                <Text size="xs" fw={600} c="dimmed">
                  Căn chỉnh theo trang
                </Text>
                <SimpleGrid cols={3} spacing={6}>
                  {PAGE_ALIGNS.map((a) => (
                    <Tooltip key={a.kind} label={a.label} withArrow>
                      <ActionIcon variant="default" size="lg" onClick={() => ed.align(a.kind)}>
                        {a.icon}
                      </ActionIcon>
                    </Tooltip>
                  ))}
                </SimpleGrid>
                <Text size="xs" fw={600} c="dimmed" mt={4}>
                  Độ mờ (tất cả)
                </Text>
                <Slider
                  value={num((many[0]?.opacity ?? 1) * 100, 100)}
                  onChange={(v) => up({ opacity: v / 100 })}
                  min={0}
                  max={100}
                  label={(v) => `${v}%`}
                />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        )}

        {obj && !isMulti && (
          <>
        <Accordion.Item value="geometry">
          <Accordion.Control icon={<IconArrowsMove size={18} />}>
            Vị trí & kích thước
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <SimpleGrid cols={2} spacing="xs">
                <NumberInput
                  label="X"
                  value={num((obj.left ?? 0) - pad)}
                  onChange={(v) => up({ left: toNum(v) + pad })}
                />
                <NumberInput
                  label="Y"
                  value={num((obj.top ?? 0) - pad)}
                  onChange={(v) => up({ top: toNum(v) + pad })}
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

        <Accordion.Item value="data">
          <Accordion.Control icon={<IconDatabase size={18} />}>
            Dữ liệu
          </Accordion.Control>
          <Accordion.Panel>
            <DataBindingPanel ed={ed} />
          </Accordion.Panel>
        </Accordion.Item>

        {textObj && (
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
                  value={textObj.text ?? ""}
                  onChange={(e) => up({ text: e.currentTarget.value })}
                />
                <FontFamilyCombobox
                  value={(textObj.fontFamily as string) ?? "Be Vietnam Pro"}
                  ed={ed}
                  onChange={(fontFamily) => up({ fontFamily })}
                />
                <SimpleGrid cols={2} spacing="xs">
                  <NumberInput
                    label="Cỡ chữ"
                    value={num(textObj.fontSize, 40)}
                    min={1}
                    onChange={(v) => up({ fontSize: toNum(v) })}
                  />
                  <Select
                    label="Đậm"
                    value={String(textObj.fontWeight ?? "400")}
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
                    value={(textObj.textAlign as string) ?? "left"}
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
                      active={textObj.fontStyle === "italic"}
                      onClick={() =>
                        up({
                          fontStyle: textObj.fontStyle === "italic" ? "normal" : "italic",
                        })
                      }
                    >
                      <IconItalic size={18} />
                    </IconBtn>
                    <IconBtn
                      label="Gạch chân"
                      active={Boolean(textObj.underline)}
                      onClick={() => up({ underline: !textObj.underline })}
                    >
                      <IconUnderline size={18} />
                    </IconBtn>
                    <IconBtn
                      label="Gạch ngang"
                      active={Boolean(textObj.linethrough)}
                      onClick={() => up({ linethrough: !textObj.linethrough })}
                    >
                      <IconStrikethrough size={18} />
                    </IconBtn>
                    <IconBtn
                      label="Chữ hoa/thường"
                      active={isMostlyUpper(textObj.text ?? "")}
                      onClick={() => {
                        const s = textObj.text ?? "";
                        if (!s) return;
                        up({
                          text: isMostlyUpper(s) ? s.toLowerCase() : s.toUpperCase(),
                        });
                      }}
                    >
                      <IconLetterCase size={18} />
                    </IconBtn>
                  </ActionIcon.Group>
                </Group>
                <Group gap="xs" wrap="wrap">
                  <TextSpacingPopover text={textObj} onPatch={up} />
                  <TextEffectsPopover text={textObj} onPatch={up} />
                  <PositionPopover ed={ed} />
                </Group>
                <SimpleGrid cols={2} spacing="xs">
                  <NumberInput
                    label="Giãn dòng"
                    step={0.1}
                    decimalScale={2}
                    value={textObj.lineHeight ?? 1.16}
                    onChange={(v) => up({ lineHeight: toNum(v) })}
                  />
                  <NumberInput
                    label="Giãn chữ"
                    value={num(textObj.charSpacing, 0)}
                    onChange={(v) => up({ charSpacing: toNum(v) })}
                  />
                </SimpleGrid>
                <ColorPalettePanel
                  title="Màu chữ"
                  value={(textObj.fill as string) ?? "#1f1d1b"}
                  onChange={(c) => up({ fill: c })}
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
                <ColorPalettePanel
                  title="Màu nền"
                  value={typeof obj.fill === "string" ? obj.fill : "#ff6600"}
                  onChange={(c) => up({ fill: c })}
                />
                <GradientEditorPopover obj={obj} onPatch={up} />
                {isRect && (
                  <NumberInput
                    label="Bo góc"
                    value={num((obj as fabric.Rect).rx, 0)}
                    min={0}
                    onChange={(v) => up({ rx: toNum(v), ry: toNum(v) })}
                  />
                )}
                {isGradientFill(obj.fill) && (
                  <Text size="xs" c="dimmed">
                    Đang dùng gradient — chọn “Màu đặc” trong popover để quay lại màu đơn.
                  </Text>
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
              <Stack gap="xs">
                <NumberInput
                  label="Bo góc (px)"
                  min={0}
                  value={num((obj as unknown as { gpCornerRadius?: number }).gpCornerRadius, 0)}
                  onChange={(v) => up({ gpCornerRadius: toNum(v) })}
                />
                <Text c="dimmed" size="xs">
                  Gán slot ảnh ở mục Dữ liệu bên dưới — ảnh thật thay ở bước Tạo ảnh.
                </Text>
              </Stack>
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
              <ColorPalettePanel
                title="Màu viền"
                value={(obj.stroke as string) ?? "#000000"}
                onChange={(c) => up({ stroke: c })}
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
          </>
        )}
      </Accordion>
      {!obj && (
        <Text size="sm" c="dimmed" ta="center" mt="md">
          Chọn đối tượng trên canvas để chỉnh thuộc tính.
        </Text>
      )}
    </PanelShell>
  );
}
