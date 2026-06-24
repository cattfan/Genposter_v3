import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Group,
  Menu,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconCircle,
  IconDeviceFloppy,
  IconFilePlus,
  IconFolderOpen,
  IconHeading,
  IconLine,
  IconPhotoPlus,
  IconPhotoUp,
  IconPlus,
  IconSquare,
  IconTypography,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
} from "@tabler/icons-react";

import type { EditorApi } from "./useEditor.js";
import { pickImageDataUrl } from "./pickImage.js";

export function Toolbar({
  ed,
  name,
  onName,
  onNew,
  onOpen,
  onSave,
  saving,
}: {
  ed: EditorApi;
  name: string;
  onName: (v: string) => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Group className="editor-toolbar" gap="xs" wrap="nowrap" h={56} px="sm">
      <Tooltip label="Mẫu mới">
        <ActionIcon variant="subtle" color="gray" size="lg" onClick={onNew}>
          <IconFilePlus size={20} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Mở mẫu">
        <ActionIcon variant="subtle" color="gray" size="lg" onClick={onOpen}>
          <IconFolderOpen size={20} />
        </ActionIcon>
      </Tooltip>

      <TextInput
        value={name}
        onChange={(e) => onName(e.currentTarget.value)}
        placeholder="Tên mẫu…"
        w={220}
        variant="filled"
        styles={{ input: { fontWeight: 700 } }}
      />

      <Button
        leftSection={<IconDeviceFloppy size={18} />}
        loading={saving}
        onClick={onSave}
      >
        Lưu mẫu
      </Button>

      <Divider orientation="vertical" />

      <Menu shadow="md" position="bottom-start" width={210}>
        <Menu.Target>
          <Button variant="light" leftSection={<IconPlus size={18} />}>
            Thêm
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Văn bản</Menu.Label>
          <Menu.Item
            leftSection={<IconHeading size={16} />}
            onClick={() => ed.addText(true)}
          >
            Tiêu đề
          </Menu.Item>
          <Menu.Item
            leftSection={<IconTypography size={16} />}
            onClick={() => ed.addText(false)}
          >
            Văn bản
          </Menu.Item>
          <Menu.Label>Hình ảnh</Menu.Label>
          <Menu.Item
            leftSection={<IconPhotoUp size={16} />}
            onClick={async () => {
              const url = await pickImageDataUrl();
              if (url) await ed.addImageDataUrl(url);
            }}
          >
            Ảnh từ máy
          </Menu.Item>
          <Menu.Item
            leftSection={<IconPhotoPlus size={16} />}
            onClick={() => void ed.addImageSlot()}
          >
            Ô ảnh (theo dữ liệu)
          </Menu.Item>
          <Menu.Label>Hình khối</Menu.Label>
          <Menu.Item
            leftSection={<IconSquare size={16} />}
            onClick={() => ed.addRect()}
          >
            Chữ nhật
          </Menu.Item>
          <Menu.Item
            leftSection={<IconCircle size={16} />}
            onClick={() => ed.addCircle()}
          >
            Tròn
          </Menu.Item>
          <Menu.Item
            leftSection={<IconLine size={16} />}
            onClick={() => ed.addLine()}
          >
            Đường kẻ
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Divider orientation="vertical" />

      <ActionIcon.Group>
        <Tooltip label="Hoàn tác (Ctrl+Z)">
          <ActionIcon
            variant="default"
            size="lg"
            onClick={ed.undo}
            disabled={!ed.canUndo}
          >
            <IconArrowBackUp size={20} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Làm lại (Ctrl+Y)">
          <ActionIcon
            variant="default"
            size="lg"
            onClick={ed.redo}
            disabled={!ed.canRedo}
          >
            <IconArrowForwardUp size={20} />
          </ActionIcon>
        </Tooltip>
      </ActionIcon.Group>

      <Box style={{ flex: 1 }} />

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
