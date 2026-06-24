import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Group,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconArrowLeft,
  IconDeviceFloppy,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
} from "@tabler/icons-react";

import type { EditorApi } from "./useEditor.js";

export function Toolbar({
  ed,
  name,
  onName,
  onBack,
  onSave,
  saving,
  pageLabel,
}: {
  ed: EditorApi;
  name: string;
  onName: (v: string) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
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
        placeholder="Tên mẫu…"
        w={200}
        variant="filled"
        styles={{ input: { fontWeight: 700 } }}
      />

      <Button leftSection={<IconDeviceFloppy size={18} />} loading={saving} onClick={onSave}>
        Lưu mẫu
      </Button>

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
