import { useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Menu,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconCopy, IconDotsVertical, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import type { TemplatePage } from "@genposter/schema";

function pageLabel(page: TemplatePage, index: number): string {
  const name = page.name?.trim();
  return name || String(index + 1);
}

export function PageStrip({
  pages,
  currentIndex,
  aspect,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onReorder,
  onRename,
}: {
  pages: TemplatePage[];
  currentIndex: number;
  aspect: number; // width / height
  onSelect: (i: number) => void;
  onAdd: () => void;
  onDuplicate: (i: number) => void;
  onDelete: (i: number) => void;
  onReorder: (from: number, to: number) => void;
  onRename: (i: number, name: string) => void;
}) {
  const thumbH = 84;
  const thumbW = Math.max(40, Math.round(thumbH * (aspect || 0.7)));
  const [renameIndex, setRenameIndex] = useState<number | null>(null);
  const [renameInput, setRenameInput] = useState("");

  function openRename(i: number) {
    setRenameIndex(i);
    setRenameInput(pages[i]?.name?.trim() ?? "");
  }

  function submitRename() {
    if (renameIndex === null) return;
    onRename(renameIndex, renameInput.trim());
    setRenameIndex(null);
    setRenameInput("");
  }

  return (
    <div className="page-strip">
      <ScrollArea type="auto" scrollbars="x" offsetScrollbars>
        <Group gap="sm" wrap="nowrap" align="flex-start" p="xs">
          {pages.map((p, i) => (
            <Box
              key={p.id}
              pos="relative"
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const from = Number(e.dataTransfer.getData("text/plain"));
                if (!Number.isNaN(from) && from !== i) onReorder(from, i);
              }}
            >
              <Tooltip label={pageLabel(p, i)} withArrow>
                <UnstyledButton
                  className="page-thumb"
                  data-active={i === currentIndex || undefined}
                  style={{ width: thumbW, height: thumbH }}
                  onClick={() => onSelect(i)}
                  onDoubleClick={() => openRename(i)}
                >
                  {p.thumbnail ? (
                    <img
                      src={p.thumbnail}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <Box w="100%" h="100%" bg="gray.1" />
                  )}
                </UnstyledButton>
              </Tooltip>
              <Text
                size="xs"
                ta="center"
                mt={2}
                c={i === currentIndex ? "riviu.7" : "dimmed"}
                truncate
                maw={thumbW}
              >
                {pageLabel(p, i)}
              </Text>
              <Menu position="top-end" withinPortal>
                <Menu.Target>
                  <ActionIcon
                    variant="default"
                    size="xs"
                    pos="absolute"
                    style={{ top: 2, right: 2 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconDotsVertical size={12} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => openRename(i)}>
                    Đổi tên
                  </Menu.Item>
                  <Menu.Item leftSection={<IconCopy size={14} />} onClick={() => onDuplicate(i)}>
                    Nhân bản
                  </Menu.Item>
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    disabled={pages.length <= 1}
                    onClick={() => onDelete(i)}
                  >
                    Xoá
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Box>
          ))}
          <Tooltip label="Thêm trang">
            <UnstyledButton
              className="page-thumb add"
              style={{ width: thumbW, height: thumbH }}
              onClick={onAdd}
            >
              <IconPlus size={20} />
            </UnstyledButton>
          </Tooltip>
        </Group>
      </ScrollArea>

      <Modal
        opened={renameIndex !== null}
        onClose={() => setRenameIndex(null)}
        title="Đổi tên trang"
        centered
        size="sm"
      >
        <Stack>
          <TextInput
            label="Tên trang"
            placeholder={`Trang ${renameIndex !== null ? renameIndex + 1 : ""}`}
            value={renameInput}
            onChange={(e) => setRenameInput(e.currentTarget.value)}
            data-autofocus
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
            }}
          />
          <Text size="xs" c="dimmed">
            Bỏ trống để hiện số thứ tự. Double-click thumb cũng mở hộp thoại này.
          </Text>
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setRenameIndex(null)}>
              Hủy
            </Button>
            <Button onClick={submitRename}>Lưu</Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}

export function formatPageToolbarLabel(pages: TemplatePage[], pageIndex: number): string {
  if (!pages.length) return "";
  const i = Math.min(pageIndex, pages.length - 1);
  const page = pages[i];
  const name = page?.name?.trim();
  const position = `${i + 1}/${pages.length}`;
  return name ? `${name} (${position})` : `Trang ${position}`;
}
