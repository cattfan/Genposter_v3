import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Group,
  Loader,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconArrowLeft,
  IconCheck,
  IconRefresh,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
} from "@tabler/icons-react";

import type { EditorApi } from "./useEditor.js";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

function SaveIndicator({
  status,
  onRetry,
}: {
  status: SaveStatus;
  onRetry: () => void;
}) {
  if (status === "saving") {
    return (
      <Group gap={6} wrap="nowrap">
        <Loader size={16} color="dimmed" />
        <Text size="sm" c="dimmed">
          Đang lưu…
        </Text>
      </Group>
    );
  }
  if (status === "error") {
    return (
      <Tooltip label="Bấm để thử lưu lại" withArrow>
        <UnstyledButton onClick={onRetry}>
          <Group gap={6} wrap="nowrap">
            <IconRefresh size={16} color="var(--mantine-color-red-6)" />
            <Text size="sm" c="red">
              Lỗi lưu
            </Text>
          </Group>
        </UnstyledButton>
      </Tooltip>
    );
  }
  if (status === "saved") {
    return (
      <Group gap={6} wrap="nowrap">
        <IconCheck size={16} color="var(--mantine-color-teal-6)" />
        <Text size="sm" c="dimmed">
          Đã lưu
        </Text>
      </Group>
    );
  }
  return null;
}

export function Toolbar({
  ed,
  name,
  onName,
  onNameBlur,
  onBack,
  saveStatus,
  onRetrySave,
  pageLabel,
}: {
  ed: EditorApi;
  name: string;
  onName: (v: string) => void;
  onNameBlur: () => void;
  onBack: () => void;
  saveStatus: SaveStatus;
  onRetrySave: () => void;
  pageLabel: string;
}) {
  return (
    <Group className="editor-toolbar" gap="xs" wrap="nowrap" h={56} px="sm">
      <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={18} />} onClick={onBack}>
        Trang tổng
      </Button>

      <TextInput
        value={name}
        onChange={(e) => onName(e.currentTarget.value)}
        onBlur={onNameBlur}
        placeholder="Tên mẫu…"
        w={200}
        variant="filled"
        styles={{ input: { fontWeight: 700 } }}
      />

      <SaveIndicator status={saveStatus} onRetry={onRetrySave} />

      <Divider orientation="vertical" />

      <ActionIcon.Group>
        <Tooltip label="Hoàn tác (Ctrl+Z)">
          <ActionIcon variant="default" size="lg" onClick={ed.undo} disabled={!ed.canUndo}>
            <IconArrowBackUp size={20} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Làm lại (Ctrl+Y)">
          <ActionIcon variant="default" size="lg" onClick={ed.redo} disabled={!ed.canRedo}>
            <IconArrowForwardUp size={20} />
          </ActionIcon>
        </Tooltip>
      </ActionIcon.Group>

      <Box style={{ flex: 1 }} />

      <Text size="sm" c="dimmed">
        {pageLabel}
      </Text>

      <ActionIcon.Group>
        <Tooltip label="Thu nhỏ">
          <ActionIcon variant="default" size="lg" onClick={ed.zoomOut}>
            <IconZoomOut size={20} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Về 50%">
          <ActionIcon variant="default" size="lg" onClick={() => ed.setZoom(0.5)}>
            <IconZoomReset size={20} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Phóng to">
          <ActionIcon variant="default" size="lg" onClick={ed.zoomIn}>
            <IconZoomIn size={20} />
          </ActionIcon>
        </Tooltip>
      </ActionIcon.Group>
      <Text size="sm" w={46} ta="center" c="dimmed">
        {Math.round(ed.zoom * 100)}%
      </Text>
    </Group>
  );
}
