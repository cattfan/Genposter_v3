import { useState } from "react";
import {
  ActionIcon,
  AspectRatio,
  Box,
  Button,
  Card,
  Group,
  Menu,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  IconCheck,
  IconCopy,
  IconDotsVertical,
  IconPencil,
  IconPhoto,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import type { RecipeSummary } from "../../lib/recipe-io.js";
import type { TemplateSetSummary } from "../../lib/templateset-io.js";

const PICK_THUMB_H = 76;
const PICK_MAX_THUMBS = 4;

/** Selectable template-set row with page previews, used in the create modal. */
function SetPickRow({
  set,
  selected,
  onSelect,
}: {
  set: TemplateSetSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  const thumbW = Math.max(28, Math.round(PICK_THUMB_H * (set.width / set.height)));
  const shown = set.pages.slice(0, PICK_MAX_THUMBS);
  const extra = set.pages.length - shown.length;

  return (
    <UnstyledButton
      className={`set-pick${selected ? " set-pick--selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <Group gap="sm" wrap="nowrap">
        <Group gap={6} wrap="nowrap">
          {shown.map((p) => (
            <div key={p.id} className="set-pick__thumb" style={{ width: thumbW, height: PICK_THUMB_H }}>
              {p.thumbnail ? (
                <img src={p.thumbnail} alt="" />
              ) : (
                <Box bg="gray.1" w="100%" h="100%" />
              )}
            </div>
          ))}
          {extra > 0 && (
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              +{extra}
            </Text>
          )}
        </Group>
        <Box style={{ minWidth: 0, flex: 1 }}>
          <Text fw={600} size="sm" truncate>
            {set.name}
          </Text>
          <Text size="xs" c="dimmed">
            {set.pages.length} trang · {set.width}×{set.height}
          </Text>
        </Box>
        {selected && (
          <ThemeIcon color="riviu" size="sm" radius="xl">
            <IconCheck size={13} stroke={3} />
          </ThemeIcon>
        )}
      </Group>
    </UnstyledButton>
  );
}

export function ProduceHome({
  recipes,
  sets,
  onOpen,
  onCreate,
  onDuplicate,
  onRename,
  onDelete,
}: {
  recipes: RecipeSummary[];
  sets: TemplateSetSummary[];
  onOpen: (id: string) => void;
  onCreate: (templateId: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);

  const setById = new Map(sets.map((s) => [s.id, s]));

  function pickSet(id: string) {
    setTemplateId(id);
    // Tên khuôn theo bộ mẫu cho tới khi người dùng tự gõ tên khác.
    if (!nameEdited) setNameInput(setById.get(id)?.name ?? "");
  }

  function doCreate() {
    if (!templateId) return;
    onCreate(templateId, nameInput.trim());
    setCreateOpen(false);
    setNameInput("");
    setNameEdited(false);
    setTemplateId(null);
  }

  function doRename() {
    if (!renameId) return;
    onRename(renameId, nameInput.trim() || "Khuôn");
    setRenameId(null);
    setNameInput("");
  }

  return (
    <div className="produce-home">
      <Group justify="space-between" align="center" mb="lg">
        <Title order={3}>Khuôn của bạn</Title>
        <Button
          leftSection={<IconPlus size={18} />}
          disabled={sets.length === 0}
          onClick={() => {
            setNameEdited(false);
            setNameInput(sets[0]?.name ?? "");
            setTemplateId(sets[0]?.id ?? null);
            setCreateOpen(true);
          }}
        >
          Tạo khuôn mới
        </Button>
      </Group>

      {recipes.length === 0 ? (
        <Stack align="center" gap="sm" py={60} c="dimmed">
          <IconPhoto size={48} />
          <Text>
            {sets.length === 0
              ? "Chưa có bộ mẫu nào. Hãy tạo mẫu ở tab Thiết kế trước."
              : "Chưa có khuôn nào. Bấm “Tạo khuôn mới” để bắt đầu."}
          </Text>
        </Stack>
      ) : (
        <Stack gap="md">
          {recipes.map((r) => {
            const set = setById.get(r.templateId);
            return (
              <Card key={r.id} withBorder radius="lg" padding="md">
                <Group justify="space-between" mb="sm">
                  <Group gap="xs">
                    <Text fw={700}>{r.name}</Text>
                    <Text size="sm" c={set ? "dimmed" : "red"}>
                      {set ? set.name : "⚠ thiếu bộ mẫu"}
                      {set ? ` · ${set.pages.length} trang` : ""}
                      {r.sheet ? ` · ${r.sheet}` : " · chưa chọn sheet"}
                      {r.bindingCount > 0 ? ` · ${r.bindingCount} gán` : ""}
                    </Text>
                  </Group>
                  <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray">
                        <IconDotsVertical size={18} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconPencil size={14} />}
                        onClick={() => {
                          setRenameId(r.id);
                          setNameInput(r.name);
                        }}
                      >
                        Đổi tên
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconCopy size={14} />}
                        onClick={() => onDuplicate(r.id)}
                      >
                        Nhân bản
                      </Menu.Item>
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => onDelete(r.id, r.name)}
                      >
                        Xoá khuôn
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>

                <UnstyledButton
                  onClick={() => onOpen(r.id)}
                  style={{ display: "block", width: "100%" }}
                >
                  {set && set.pages.length > 0 ? (
                    <ScrollArea type="auto" scrollbars="x" offsetScrollbars>
                      <Group gap="sm" wrap="nowrap" align="flex-start">
                        {set.pages.map((p, i) => (
                          <div key={p.id} className="home-thumb">
                            <AspectRatio
                              ratio={set.width / set.height}
                              style={{ width: 120 }}
                            >
                              {p.thumbnail ? (
                                <img
                                  src={p.thumbnail}
                                  alt=""
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                              ) : (
                                <Box bg="gray.1" />
                              )}
                            </AspectRatio>
                            <Text size="xs" ta="center" mt={4} c="dimmed">
                              {i + 1}
                            </Text>
                          </div>
                        ))}
                      </Group>
                    </ScrollArea>
                  ) : (
                    <Text size="sm" c="dimmed">
                      Bấm để mở và cấu hình khuôn.
                    </Text>
                  )}
                </UnstyledButton>
              </Card>
            );
          })}
        </Stack>
      )}

      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo khuôn mới"
        size="lg"
        centered
      >
        <Stack>
          <Box>
            <Text size="sm" fw={500} mb={6}>
              Chọn bộ mẫu
            </Text>
            <ScrollArea.Autosize mah={340} type="auto" offsetScrollbars>
              <Stack gap={6}>
                {sets.map((s) => (
                  <SetPickRow
                    key={s.id}
                    set={s}
                    selected={templateId === s.id}
                    onSelect={() => pickSet(s.id)}
                  />
                ))}
              </Stack>
            </ScrollArea.Autosize>
          </Box>
          <TextInput
            label="Tên khuôn"
            placeholder="Bỏ trống = Khuôn mới"
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.currentTarget.value);
              setNameEdited(true);
            }}
            data-autofocus
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={doCreate} disabled={!templateId}>
              Tạo
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={renameId !== null}
        onClose={() => setRenameId(null)}
        title="Đổi tên khuôn"
        centered
      >
        <Stack>
          <TextInput
            label="Tên khuôn"
            value={nameInput}
            onChange={(e) => setNameInput(e.currentTarget.value)}
            data-autofocus
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setRenameId(null)}>
              Hủy
            </Button>
            <Button onClick={doRename}>Lưu</Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
