import { ActionIcon, Box, Group, Menu, ScrollArea, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconCopy, IconDotsVertical, IconPlus, IconTrash } from "@tabler/icons-react";
import type { TemplatePage } from "@genposter/schema";

export function PageStrip({
  pages,
  currentIndex,
  aspect,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onReorder,
}: {
  pages: TemplatePage[];
  currentIndex: number;
  aspect: number; // width / height
  onSelect: (i: number) => void;
  onAdd: () => void;
  onDuplicate: (i: number) => void;
  onDelete: (i: number) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const thumbH = 84;
  const thumbW = Math.max(40, Math.round(thumbH * (aspect || 0.7)));

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
              <UnstyledButton
                className="page-thumb"
                data-active={i === currentIndex || undefined}
                style={{ width: thumbW, height: thumbH }}
                onClick={() => onSelect(i)}
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
              <Text size="xs" ta="center" mt={2} c={i === currentIndex ? "riviu.7" : "dimmed"}>
                {i + 1}
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
    </div>
  );
}
