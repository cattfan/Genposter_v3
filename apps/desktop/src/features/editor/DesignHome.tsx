import { useEffect, useState } from "react";
import {
  ActionIcon,
  AspectRatio,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Menu,
  Modal,
  NumberInput,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCopy,
  IconDotsVertical,
  IconLayoutBoardSplit,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { DEFAULT_TEMPLATE_H, DEFAULT_TEMPLATE_W } from "@genposter/schema";

import {
  createTemplateSet,
  deleteTemplateSet,
  duplicateTemplateSet,
  listTemplateSets,
  renameTemplateSet,
  type TemplateSetSummary,
} from "../../lib/templateset-io.js";
import { nextUntitledName } from "../../lib/templateset-util.js";
import { ConfirmModal } from "../../components/ConfirmModal.js";
import { TEMPLATE_SIZE_PRESETS } from "./template-presets.js";
import { filterTemplateSets, formatRelativeTime } from "./template-set-filter.js";

export function DesignHome({
  onOpen,
}: {
  onOpen: (setId: string, pageId?: string) => void;
}) {
  const [sets, setSets] = useState<TemplateSetSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [w, setW] = useState<number>(DEFAULT_TEMPLATE_W);
  const [h, setH] = useState<number>(DEFAULT_TEMPLATE_H);
  const [sizePresetId, setSizePresetId] = useState("default");
  const [searchQuery, setSearchQuery] = useState("");

  const visibleSets = filterTemplateSets(sets, searchQuery);

  async function refresh() {
    try {
      setSets(await listTemplateSets());
    } catch (e) {
      notifications.show({ color: "red", message: `Không đọc được mẫu: ${String(e)}` });
    } finally {
      setListLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);

  async function doCreate() {
    const name = nameInput.trim() || nextUntitledName(sets.map((s) => s.name));
    try {
      const set = await createTemplateSet(name, w, h);
      setCreateOpen(false);
      setNameInput("");
      onOpen(set.id);
    } catch (e) {
      notifications.show({ color: "red", message: `Lỗi tạo mẫu: ${String(e)}` });
    }
  }

  async function doRename() {
    if (!renameId) return;
    try {
      await renameTemplateSet(renameId, nameInput.trim() || "Mẫu");
      setRenameId(null);
      setNameInput("");
      await refresh();
    } catch (e) {
      notifications.show({ color: "red", message: `Lỗi đổi tên: ${String(e)}` });
    }
  }

  async function doDuplicate(id: string) {
    try {
      await duplicateTemplateSet(id);
      await refresh();
      notifications.show({ color: "teal", message: "Đã nhân bản mẫu" });
    } catch (e) {
      notifications.show({ color: "red", message: `Lỗi nhân bản: ${String(e)}` });
    }
  }

  async function doDelete(id: string) {
    try {
      await deleteTemplateSet(id);
      await refresh();
    } catch (e) {
      notifications.show({ color: "red", message: `Lỗi xoá: ${String(e)}` });
    }
  }

  return (
    <div className="design-home">
      <Group justify="space-between" align="center" mb="lg">
        <Title order={3}>Mẫu của bạn</Title>
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={() => {
            setNameInput("");
            setSizePresetId("default");
            setW(DEFAULT_TEMPLATE_W);
            setH(DEFAULT_TEMPLATE_H);
            setCreateOpen(true);
          }}
        >
          Tạo mẫu mới
        </Button>
      </Group>

      {!listLoading && sets.length > 0 && (
        <TextInput
          placeholder="Tìm mẫu…"
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          mb="md"
        />
      )}

      {listLoading ? (
        <Stack align="center" gap="sm" py={60}>
          <Loader size="sm" color="riviu" />
          <Text c="dimmed" size="sm">
            Đang đọc danh sách mẫu…
          </Text>
        </Stack>
      ) : sets.length === 0 ? (
        <Stack align="center" gap="sm" py={60} c="dimmed">
          <IconLayoutBoardSplit size={48} />
          <Text>Chưa có mẫu nào. Bấm “Tạo mẫu mới” để bắt đầu.</Text>
        </Stack>
      ) : visibleSets.length === 0 ? (
        <Stack align="center" gap="sm" py={60} c="dimmed">
          <IconLayoutBoardSplit size={48} />
          <Text>Không tìm thấy mẫu.</Text>
        </Stack>
      ) : (
        <Stack gap="md">
          {visibleSets.map((s) => (
            <Card key={s.id} withBorder radius="lg" padding="md">
              <Group justify="space-between" mb="sm">
                <Group gap="xs">
                  <Text fw={700}>{s.name}</Text>
                  <Text size="sm" c="dimmed">
                    {s.pages.length} trang · {s.width}×{s.height}
                    {s.updatedAt ? ` · ${formatRelativeTime(s.updatedAt)}` : ""}
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
                        setRenameId(s.id);
                        setNameInput(s.name);
                      }}
                    >
                      Đổi tên
                    </Menu.Item>
                    <Menu.Item leftSection={<IconCopy size={14} />} onClick={() => void doDuplicate(s.id)}>
                      Nhân bản
                    </Menu.Item>
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => setDeleteTarget({ id: s.id, name: s.name })}
                    >
                      Xoá mẫu
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>

              <ScrollArea type="auto" scrollbars="x" offsetScrollbars>
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  {s.pages.map((p, i) => (
                    <UnstyledButton
                      key={p.id}
                      className="home-thumb"
                      onClick={() => onOpen(s.id, p.id)}
                    >
                      <AspectRatio ratio={s.width / s.height} style={{ width: 120 }}>
                        {p.thumbnail ? (
                          <img
                            src={p.thumbnail}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        ) : (
                          <Box bg="gray.1" />
                        )}
                      </AspectRatio>
                      <Text size="xs" ta="center" mt={4} c="dimmed">
                        {p.name?.trim() || i + 1}
                      </Text>
                    </UnstyledButton>
                  ))}
                  <UnstyledButton className="home-thumb add" onClick={() => onOpen(s.id, "__add__")}>
                    <AspectRatio ratio={s.width / s.height} style={{ width: 120 }}>
                      <Box className="home-thumb-add-inner">
                        <IconPlus size={22} />
                      </Box>
                    </AspectRatio>
                    <Text size="xs" ta="center" mt={4} c="dimmed">
                      Thêm trang
                    </Text>
                  </UnstyledButton>
                </Group>
              </ScrollArea>
            </Card>
          ))}
        </Stack>
      )}

      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="Tạo mẫu mới" centered>
        <Stack>
          <TextInput
            label="Tên mẫu"
            placeholder="Bỏ trống = Mẫu mới (N)"
            value={nameInput}
            onChange={(e) => setNameInput(e.currentTarget.value)}
            data-autofocus
          />
          <Stack gap={6}>
            <Text size="sm" fw={500}>
              Khổ canvas
            </Text>
            <Group gap="xs">
              {TEMPLATE_SIZE_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  size="xs"
                  variant={sizePresetId === preset.id ? "filled" : "default"}
                  onClick={() => {
                    setSizePresetId(preset.id);
                    setW(preset.width);
                    setH(preset.height);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </Group>
          </Stack>
          <Group grow>
            <NumberInput
              label="Rộng (px)"
              min={100}
              value={w}
              onChange={(v) => {
                setSizePresetId("");
                setW(typeof v === "number" ? v : DEFAULT_TEMPLATE_W);
              }}
            />
            <NumberInput
              label="Cao (px)"
              min={100}
              value={h}
              onChange={(v) => {
                setSizePresetId("");
                setH(typeof v === "number" ? v : DEFAULT_TEMPLATE_H);
              }}
            />
          </Group>
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={() => void doCreate()}>Tạo</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={renameId !== null} onClose={() => setRenameId(null)} title="Đổi tên mẫu" centered>
        <Stack>
          <TextInput
            label="Tên mẫu"
            value={nameInput}
            onChange={(e) => setNameInput(e.currentTarget.value)}
            data-autofocus
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setRenameId(null)}>
              Hủy
            </Button>
            <Button onClick={() => void doRename()}>Lưu</Button>
          </Group>
        </Stack>
      </Modal>

      <ConfirmModal
        opened={deleteTarget !== null}
        title="Xoá mẫu"
        message={`Xoá mẫu "${deleteTarget?.name ?? ""}"? Không thể hoàn tác.`}
        onConfirm={() => {
          if (deleteTarget) void doDelete(deleteTarget.id);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
