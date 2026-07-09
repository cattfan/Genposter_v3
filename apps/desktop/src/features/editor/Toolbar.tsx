import {
  ActionIcon,
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
  IconDatabase,
  IconRefresh,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
} from "@tabler/icons-react";

import { ResizeCanvasPopover } from "./ResizeCanvasPopover.js";
import type { EditorApi } from "./useEditor.js";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

function SaveIndicator({
  status,
  onRetry,
}: {
  status: SaveStatus;
  onRetry: () => void;
}) {
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
  if (status === "saving") {
    return (
      <Group gap={6} wrap="nowrap">
        <Loader size={14} />
        <Text size="sm" c="dimmed">
          Đang lưu…
        </Text>
      </Group>
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
  canvasWidth,
  canvasHeight,
  onResizeCanvas,
  dataPreviewOn,
  onToggleDataPreview,
}: {
  ed: EditorApi;
  name: string;
  onName: (v: string) => void;
  onNameBlur: () => void;
  onBack: () => void;
  saveStatus: SaveStatus;
  onRetrySave: () => void;
  pageLabel: string;
  canvasWidth?: number;
  canvasHeight?: number;
  onResizeCanvas?: (w: number, h: number, mode: "scaleContent" | "clipOnly") => void;
  dataPreviewOn?: boolean;
  onToggleDataPreview?: () => void;
}) {
  const restoring = ed.isRestoring();
  void ed.tick;
  return (
    <div className="editor-toolbar">
      <Group gap="xs" wrap="nowrap" className="toolbar-left">
        <Button
          variant="subtle"
          color="gray"
          size="compact-sm"
          leftSection={<IconArrowLeft size={16} />}
          onClick={onBack}
        >
          Trang tổng
        </Button>
        <TextInput
          value={name}
          onChange={(e) => onName(e.currentTarget.value)}
          onBlur={onNameBlur}
          placeholder="Tên mẫu…"
          w={160}
          size="xs"
          variant="filled"
          styles={{ input: { fontWeight: 700 } }}
        />
        <SaveIndicator status={saveStatus} onRetry={onRetrySave} />
        <Divider orientation="vertical" />
        <Tooltip label="Hoàn tác (Ctrl+Z)" withArrow>
          <ActionIcon
            variant="default"
            size="md"
            onClick={() => void ed.undo()}
            disabled={!ed.canUndo || restoring}
          >
            <IconArrowBackUp size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Làm lại (Ctrl+Y)" withArrow>
          <ActionIcon
            variant="default"
            size="md"
            onClick={() => void ed.redo()}
            disabled={!ed.canRedo || restoring}
          >
            <IconArrowForwardUp size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Text size="sm" fw={600} c="dimmed" className="toolbar-center" truncate>
        {pageLabel}
      </Text>

      <Group gap="xs" wrap="nowrap" className="toolbar-right">
        {onToggleDataPreview && (
          <Tooltip
            label={dataPreviewOn ? "Tắt xem với dữ liệu" : "Xem với dữ liệu mẫu"}
            withArrow
          >
            <ActionIcon
              variant={dataPreviewOn ? "filled" : "default"}
              color={dataPreviewOn ? "riviu" : undefined}
              size="md"
              onClick={onToggleDataPreview}
              aria-label="Xem với dữ liệu"
            >
              <IconDatabase size={18} />
            </ActionIcon>
          </Tooltip>
        )}
        {canvasWidth && canvasHeight && onResizeCanvas && (
          <ResizeCanvasPopover
            width={canvasWidth}
            height={canvasHeight}
            onResize={onResizeCanvas}
          />
        )}
        <Group gap={0} wrap="nowrap" className="toolbar-zoom">
          <ActionIcon
            variant="default"
            size="md"
            onClick={ed.zoomOut}
            aria-label="Thu nhỏ"
            className="toolbar-zoom-btn toolbar-zoom-btn--first"
          >
            <IconZoomOut size={18} />
          </ActionIcon>
          <Tooltip label="Đặt zoom 50%" withArrow>
            <UnstyledButton className="toolbar-zoom-value" onClick={() => ed.setZoom(0.5)}>
              {Math.round(ed.zoom * 100)}%
            </UnstyledButton>
          </Tooltip>
          <ActionIcon
            variant="default"
            size="md"
            onClick={ed.zoomIn}
            aria-label="Phóng to"
            className="toolbar-zoom-btn"
          >
            <IconZoomIn size={18} />
          </ActionIcon>
          <Tooltip label="Về 50%" withArrow>
            <ActionIcon
              variant="default"
              size="md"
              onClick={() => ed.setZoom(0.5)}
              aria-label="Reset zoom"
              className="toolbar-zoom-btn toolbar-zoom-btn--last"
            >
              <IconZoomReset size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </div>
  );
}
