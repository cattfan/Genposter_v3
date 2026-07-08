import { useState } from "react";
import {
  ActionIcon,
  Button,
  Group,
  NumberInput,
  Popover,
  SegmentedControl,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconArrowsMaximize } from "@tabler/icons-react";

/** Toolbar control for changing the page's pixel size (was implemented in
 * useEditor but had no UI entry point). */
export function ResizeCanvasPopover({
  width,
  height,
  onResize,
}: {
  width: number;
  height: number;
  onResize: (w: number, h: number, mode: "scaleContent" | "clipOnly") => void;
}) {
  const [opened, setOpened] = useState(false);
  const [w, setW] = useState(width);
  const [h, setH] = useState(height);
  const [mode, setMode] = useState<"scaleContent" | "clipOnly">("scaleContent");

  return (
    <Popover
      width={260}
      position="bottom-end"
      withArrow
      withinPortal
      shadow="md"
      opened={opened}
      onChange={(o) => {
        setOpened(o);
        if (o) {
          setW(width);
          setH(height);
        }
      }}
    >
      <Popover.Target>
        <Tooltip label="Đổi kích thước trang" withArrow>
          <ActionIcon
            variant="default"
            size="md"
            onClick={() => setOpened((o) => !o)}
            aria-label="Đổi kích thước trang"
          >
            <IconArrowsMaximize size={18} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Text size="xs" fw={600}>
            Kích thước trang (px)
          </Text>
          <Group gap="xs" wrap="nowrap" grow>
            <NumberInput
              size="xs"
              label="Rộng"
              min={100}
              max={8000}
              value={w}
              onChange={(v) => setW(typeof v === "number" ? v : width)}
            />
            <NumberInput
              size="xs"
              label="Cao"
              min={100}
              max={8000}
              value={h}
              onChange={(v) => setH(typeof v === "number" ? v : height)}
            />
          </Group>
          <SegmentedControl
            size="xs"
            fullWidth
            value={mode}
            onChange={(v) => setMode(v as "scaleContent" | "clipOnly")}
            data={[
              { value: "scaleContent", label: "Co giãn nội dung" },
              { value: "clipOnly", label: "Giữ tỉ lệ, cắt lề" },
            ]}
          />
          <Button
            size="xs"
            disabled={w === width && h === height}
            onClick={() => {
              onResize(w, h, mode);
              setOpened(false);
            }}
          >
            Áp dụng
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
