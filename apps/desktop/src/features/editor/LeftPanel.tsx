import { useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  ColorInput,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconCircle,
  IconColorSwatch,
  IconDatabase,
  IconEye,
  IconEyeOff,
  IconHeading,
  IconLine,
  IconLock,
  IconPhoto,
  IconPhotoPlus,
  IconPlus,
  IconSquare,
  IconStack2,
  IconTypography,
  type IconProps,
} from "@tabler/icons-react";

import { getBool, getId, getStr, isTextType } from "../../lib/fabric-util.js";
import type { EditorApi } from "./useEditor.js";
import { BRAND_COLORS, DESIGN_SLOTS, PALETTE, TEXT_STYLE_PRESETS } from "./palette.js";
import { pickImageDataUrl } from "./pickImage.js";

type Sub = "add" | "upload" | "bg" | "data" | "layers";

const LEFT_TAB_KEY = "genposter.editor.leftTab";
const VALID: Sub[] = ["add", "upload", "bg", "data", "layers"];

function readLeftTab(): Sub {
  try {
    const v = localStorage.getItem(LEFT_TAB_KEY);
    if (v && (VALID as string[]).includes(v)) return v as Sub;
  } catch {
    /* ignore */
  }
  return "add";
}

const ADD_ITEMS: {
  label: string;
  Icon: React.ComponentType<IconProps>;
  run: (ed: EditorApi) => void;
}[] = [
  { label: "Tiêu đề", Icon: IconHeading, run: (ed) => ed.addText(true) },
  { label: "Văn bản", Icon: IconTypography, run: (ed) => ed.addText(false) },
  { label: "Chữ nhật", Icon: IconSquare, run: (ed) => ed.addRect() },
  { label: "Tròn", Icon: IconCircle, run: (ed) => ed.addCircle() },
  { label: "Đường kẻ", Icon: IconLine, run: (ed) => ed.addLine() },
  { label: "Ô ảnh", Icon: IconPhotoPlus, run: (ed) => void ed.addImageSlot() },
];

export function LeftPanel({ ed }: { ed: EditorApi }) {
  const [sub, setSub] = useState<Sub>(readLeftTab);
  const [bgColor, setBgColor] = useState("#ffffff");
  void ed.tick;

  return (
    <aside className="panel left">
      <Tabs
        value={sub}
        onChange={(v) => {
          const next = (v as Sub) ?? "add";
          setSub(next);
          try {
            localStorage.setItem(LEFT_TAB_KEY, next);
          } catch {
            /* ignore */
          }
        }}
        variant="pills"
        radius="md"
      >
        <Tabs.List grow mb="md">
          <Tooltip label="Thêm" withArrow>
            <Tabs.Tab value="add" px="xs">
              <IconPlus size={18} />
            </Tabs.Tab>
          </Tooltip>
          <Tooltip label="Ảnh" withArrow>
            <Tabs.Tab value="upload" px="xs">
              <IconPhoto size={18} />
            </Tabs.Tab>
          </Tooltip>
          <Tooltip label="Nền" withArrow>
            <Tabs.Tab value="bg" px="xs">
              <IconColorSwatch size={18} />
            </Tabs.Tab>
          </Tooltip>
          <Tooltip label="Dữ liệu" withArrow>
            <Tabs.Tab value="data" px="xs">
              <IconDatabase size={18} />
            </Tabs.Tab>
          </Tooltip>
          <Tooltip label="Lớp" withArrow>
            <Tabs.Tab value="layers" px="xs">
              <IconStack2 size={18} />
            </Tabs.Tab>
          </Tooltip>
        </Tabs.List>

        <Tabs.Panel value="add">
          <Stack gap="md">
            <SimpleGrid cols={2} spacing="xs">
              {ADD_ITEMS.map((it) => (
                <Button
                  key={it.label}
                  variant="default"
                  h={76}
                  onClick={() => it.run(ed)}
                  leftSection={<it.Icon size={24} />}
                  styles={{
                    inner: { flexDirection: "column", gap: 8 },
                    section: { marginRight: 0 },
                    label: { fontSize: 12, fontWeight: 600 },
                  }}
                >
                  {it.label}
                </Button>
              ))}
            </SimpleGrid>
            <Text size="xs" fw={600} c="dimmed">
              Style nhanh
            </Text>
            <SimpleGrid cols={1} spacing="xs">
              {TEXT_STYLE_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="light"
                  size="sm"
                  onClick={() => ed.addTextPreset(preset)}
                  styles={{ label: { fontWeight: 600 } }}
                >
                  {preset.label}
                </Button>
              ))}
            </SimpleGrid>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="upload">
          <Stack gap="sm">
            <Button
              leftSection={<IconPhoto size={18} />}
              onClick={async () => {
                const url = await pickImageDataUrl();
                if (url) await ed.addImageDataUrl(url);
              }}
            >
              Tải ảnh lên canvas
            </Button>
            <Text c="dimmed" size="xs">
              Ảnh tĩnh dùng cho trang trí. Ảnh thay theo dữ liệu hãy dùng “Ô ảnh”
              ở tab Thêm rồi gán slot trong tab Dữ liệu.
            </Text>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="bg">
          <Stack gap="sm">
            <Text size="xs" fw={600} c="dimmed">
              Màu Riviu
            </Text>
            <Group gap="xs">
              {BRAND_COLORS.map((c) => (
                <Tooltip key={c.value} label={c.label} withArrow>
                  <ActionIcon
                    variant="default"
                    size="lg"
                    aria-label={c.label}
                    onClick={() => {
                      setBgColor(c.value);
                      ed.setBackgroundColor(c.value);
                    }}
                    style={{
                      background: c.value,
                      border:
                        c.value.toLowerCase() === "#ffffff"
                          ? "1px solid var(--mantine-color-gray-4)"
                          : undefined,
                    }}
                  />
                </Tooltip>
              ))}
            </Group>
            <ColorInput
              label="Màu nền trang"
              value={bgColor}
              onChange={(c) => {
                setBgColor(c);
                ed.setBackgroundColor(c);
              }}
              swatches={PALETTE}
              format="hex"
              swatchesPerRow={8}
            />
            <Button
              variant="light"
              leftSection={<IconPhoto size={18} />}
              onClick={async () => {
                const url = await pickImageDataUrl();
                if (url) await ed.setBackgroundImageDataUrl(url);
              }}
            >
              Ảnh nền (full-bleed)
            </Button>
            <Button
              variant="subtle"
              color="gray"
              onClick={() => void ed.setBackgroundImageDataUrl(null)}
            >
              Xóa ảnh nền
            </Button>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="data">
          <DataFields ed={ed} />
        </Tabs.Panel>

        <Tabs.Panel value="layers">
          <Layers ed={ed} />
        </Tabs.Panel>
      </Tabs>
    </aside>
  );
}

function DataFields({ ed }: { ed: EditorApi }) {
  const obj = ed.getActive();
  if (!obj) {
    return (
      <div className="empty-hint">Chọn một đối tượng để gán trường dữ liệu.</div>
    );
  }
  const curBind = getStr(obj, "gpBind") ?? "";
  const curLabel = getStr(obj, "gpLabel") ?? "";
  const isRow = getBool(obj, "gpListRow");
  const text = isTextType(obj);

  return (
    <Stack gap="sm">
      <Text fw={600} size="sm">
        Gán trường cho đối tượng
      </Text>
      <Badge color={curBind ? "riviu" : "gray"} variant="light" size="lg">
        {curBind ? curLabel || curBind : "Chưa gán"}
      </Badge>
      <SimpleGrid cols={2} spacing="xs">
        {DESIGN_SLOTS.filter((s) =>
          text ? s.kind === "text" : s.kind === "photo",
        ).map((s) => (
          <Button
            key={s.bind}
            variant="default"
            size="xs"
            onClick={() => {
              if (text) ed.updateActive({ text: `[${s.label}]` });
              ed.setGpBind(obj, s.bind, s.label);
            }}
          >
            {s.label}
          </Button>
        ))}
      </SimpleGrid>
      <Button
        variant="subtle"
        color="gray"
        size="xs"
        onClick={() => ed.setGpBind(obj, "", "")}
      >
        Bỏ gán
      </Button>
      <Checkbox
        label="Thuộc hàng danh sách (list row)"
        checked={isRow}
        onChange={() => ed.toggleListRow(obj)}
      />
      <Text c="dimmed" size="xs">
        Đánh dấu các đối tượng tạo nên 1 dòng (tên, địa chỉ, giá, ảnh…). Bước Tạo
        ảnh sẽ nhân dòng này theo số mục.
      </Text>
    </Stack>
  );
}

function Layers({ ed }: { ed: EditorApi }) {
  const objs = [...ed.getObjects()].reverse();
  const active = ed.getActive();
  if (!objs.length) {
    return <div className="empty-hint">Chưa có đối tượng nào.</div>;
  }
  return (
    <Stack gap={6}>
      <Text fw={600} size="sm">
        Lớp ({objs.length})
      </Text>
      <ScrollArea.Autosize mah="calc(100vh - 200px)">
        <Stack gap={2}>
          {objs.map((o) => {
            const id = getId(o);
            const label = getStr(o, "gpLabel") || (o.type ?? "obj");
            const locked = getBool(o, "gpLocked");
            const isActive = active === o;
            return (
              <Group
                key={id}
                gap={4}
                wrap="nowrap"
                px="xs"
                py={4}
                onClick={() => ed.selectObject(o)}
                style={{
                  borderRadius: 8,
                  cursor: "pointer",
                  background: isActive
                    ? "var(--mantine-color-riviu-0)"
                    : undefined,
                }}
              >
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    ed.toggleVisible(o);
                  }}
                >
                  {o.visible ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                </ActionIcon>
                <Text
                  size="sm"
                  truncate
                  c={isActive ? "riviu.7" : undefined}
                  style={{ flex: 1 }}
                >
                  {label}
                </Text>
                {locked && (
                  <IconLock
                    size={14}
                    color="var(--mantine-color-dimmed)"
                  />
                )}
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    ed.selectObject(o);
                    ed.order("forward");
                  }}
                >
                  <IconChevronUp size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    ed.selectObject(o);
                    ed.order("backward");
                  }}
                >
                  <IconChevronDown size={16} />
                </ActionIcon>
              </Group>
            );
          })}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}
