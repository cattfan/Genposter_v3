import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Group,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconColorSwatch,
  IconHeading,
  IconLine,
  IconMoodSmile,
  IconPhoto,
  IconPhotoPlus,
  IconPlus,
  IconSearch,
  IconSquare,
  IconTypography,
  IconCircle,
  type IconProps,
} from "@tabler/icons-react";

import type { EditorApi } from "./useEditor.js";
import { ColorPalettePanel } from "./ColorPalettePanel.js";
import { filterIcons, ICON_CATEGORIES, type IconCategory } from "./icon-catalog.js";
import { TEXT_STYLE_PRESETS } from "./palette.js";
import { pickImageDataUrl } from "./pickImage.js";
import { pushRecentSticker, readRecentStickers } from "./stickerRecent.js";

type Sub = "add" | "icon" | "upload" | "bg";

const LEFT_TAB_KEY = "genposter.editor.leftTab";
const VALID: Sub[] = ["add", "icon", "upload", "bg"];

function readLeftTab(): Sub {
  try {
    const v = localStorage.getItem(LEFT_TAB_KEY);
    if (v === "data" || v === "layers") return "add";
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

  useEffect(() => {
    setBgColor(ed.getPageBackgroundColor());
  }, [ed, ed.tick]);

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
          <Tooltip label="Icon" withArrow>
            <Tabs.Tab value="icon" px="xs">
              <IconMoodSmile size={18} />
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
        </Tabs.List>

        <Tabs.Panel value="add">
          <Stack gap={4}>
            {ADD_ITEMS.map((it) => (
              <Button
                key={it.label}
                variant="default"
                fullWidth
                h={44}
                px="sm"
                justify="flex-start"
                onClick={() => it.run(ed)}
                leftSection={<it.Icon size={20} stroke={1.5} />}
                styles={{
                  inner: { justifyContent: "flex-start", gap: 10 },
                  section: { marginRight: 0 },
                  label: { fontSize: 13, fontWeight: 600 },
                }}
              >
                {it.label}
              </Button>
            ))}
            <Text size="xs" fw={600} c="dimmed" mt="sm">
              Kiểu chữ dựng sẵn
            </Text>
            {TEXT_STYLE_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="default"
                fullWidth
                h={44}
                px="sm"
                justify="flex-start"
                onClick={() => ed.addTextPreset(preset)}
                styles={{
                  inner: { justifyContent: "flex-start", gap: 10 },
                  label: { fontSize: 13, fontWeight: 600 },
                }}
              >
                {preset.label}
              </Button>
            ))}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="icon">
          <IconPickerPanel ed={ed} />
        </Tabs.Panel>

        <Tabs.Panel value="upload">
          <UploadPanel ed={ed} />
        </Tabs.Panel>

        <Tabs.Panel value="bg">
          <Stack gap="sm">
            <ColorPalettePanel
              title="Màu nền trang"
              value={bgColor}
              onChange={(c) => {
                setBgColor(c);
                ed.setBackgroundColor(c);
              }}
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
      </Tabs>
    </aside>
  );
}

function IconPickerPanel({ ed }: { ed: EditorApi }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<IconCategory | "">("");

  const results = useMemo(
    () => filterIcons(query, category || undefined),
    [query, category],
  );

  return (
    <Stack gap="sm">
      <TextInput
        size="xs"
        placeholder="Tìm icon…"
        leftSection={<IconSearch size={14} />}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
      />
      <Select
        size="xs"
        placeholder="Tất cả danh mục"
        clearable
        value={category || null}
        onChange={(v) => setCategory((v as IconCategory | null) ?? "")}
        data={ICON_CATEGORIES.map((c) => ({ value: c, label: c }))}
      />
      {results.length === 0 ? (
        <Text size="xs" c="dimmed">
          Không tìm thấy icon phù hợp.
        </Text>
      ) : (
        <Group gap="xs">
          {results.map((entry) => (
            <Tooltip key={entry.id} label={entry.label} withArrow openDelay={300}>
              <UnstyledButton
                className="icon-grid-btn"
                w={44}
                onClick={() => void ed.addIconFromSvg(entry.svg, entry.label)}
                // Trusted, hardcoded catalog SVG (see icon-catalog.ts) — not user input.
                dangerouslySetInnerHTML={{ __html: entry.svg }}
              />
            </Tooltip>
          ))}
        </Group>
      )}
    </Stack>
  );
}

function UploadPanel({ ed }: { ed: EditorApi }) {
  const [recent, setRecent] = useState<string[]>(() => readRecentStickers());

  async function uploadSticker() {
    const url = await pickImageDataUrl();
    if (!url) return;
    setRecent(pushRecentSticker(url));
    await ed.addImageDataUrl(url);
  }

  return (
    <Stack gap="sm">
      <Button leftSection={<IconPhoto size={18} />} onClick={() => void uploadSticker()}>
        Sticker PNG
      </Button>
      <Button
        variant="light"
        leftSection={<IconPhoto size={18} />}
        onClick={async () => {
          const url = await pickImageDataUrl();
          if (url) await ed.addImageDataUrl(url);
        }}
      >
        Tải ảnh lên canvas
      </Button>
      {recent.length > 0 && (
        <>
          <Text size="xs" fw={600} c="dimmed">
            Sticker gần đây
          </Text>
          <Group gap="xs">
            {recent.map((url) => (
              <UnstyledButton
                key={url.slice(0, 48)}
                className="sticker-thumb"
                onClick={() => void ed.addImageDataUrl(url)}
              >
                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </UnstyledButton>
            ))}
          </Group>
        </>
      )}
      <Text c="dimmed" size="xs">
        Sticker PNG dùng cho trang trí. Ảnh thay theo dữ liệu: thêm “Ô ảnh” ở tab Thêm.
      </Text>
    </Stack>
  );
}
