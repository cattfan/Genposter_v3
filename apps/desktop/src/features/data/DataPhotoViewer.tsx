import { ActionIcon, Group, Modal, Text } from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconX } from "@tabler/icons-react";

import { assetUrl } from "../../lib/fsx.js";

export function DataPhotoViewer({
  paths,
  index,
  onClose,
  onChange,
}: {
  paths: string[];
  index: number;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  const open = index >= 0 && index < paths.length;
  const path = open ? paths[index]! : "";
  const src = path ? assetUrl(path) : "";

  function prev() {
    onChange(index > 0 ? index - 1 : paths.length - 1);
  }

  function next() {
    onChange(index < paths.length - 1 ? index + 1 : 0);
  }

  return (
    <Modal
      opened={open}
      onClose={onClose}
      size="auto"
      centered
      padding="md"
      withCloseButton={false}
      classNames={{ content: "data-photo-viewer" }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
        if (e.key === "Escape") onClose();
      }}
    >
      <Group justify="space-between" mb="xs" wrap="nowrap">
        <Text size="sm" c="dimmed">
          {paths.length > 1 ? `${index + 1} / ${paths.length}` : "Xem ảnh"}
        </Text>
        <ActionIcon variant="subtle" color="gray" onClick={onClose} aria-label="Đóng">
          <IconX size={18} />
        </ActionIcon>
      </Group>
      {src && (
        <img src={src} alt="" className="data-photo-viewer__img" />
      )}
      {paths.length > 1 && (
        <Group justify="center" gap="md" mt="md">
          <ActionIcon variant="light" color="gray" size="lg" onClick={prev} aria-label="Ảnh trước">
            <IconChevronLeft size={20} />
          </ActionIcon>
          <ActionIcon variant="light" color="gray" size="lg" onClick={next} aria-label="Ảnh sau">
            <IconChevronRight size={20} />
          </ActionIcon>
        </Group>
      )}
    </Modal>
  );
}
