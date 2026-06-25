import { SimpleGrid, Popover, Stack, Text, UnstyledButton, ActionIcon, Tooltip } from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconChevronsDown,
  IconChevronsUp,
  IconLayoutAlignBottom,
  IconLayoutAlignCenter,
  IconLayoutAlignLeft,
  IconLayoutAlignMiddle,
  IconLayoutAlignRight,
  IconLayoutAlignTop,
  IconArrowsMove,
} from "@tabler/icons-react";

import type { AlignKind, EditorApi } from "./useEditor.js";

const PAGE_ALIGNS: { kind: AlignKind; label: string; icon: React.ReactNode }[] = [
  { kind: "left", label: "Căn trái", icon: <IconLayoutAlignLeft size={16} /> },
  { kind: "center-h", label: "Giữa ngang", icon: <IconLayoutAlignCenter size={16} /> },
  { kind: "right", label: "Căn phải", icon: <IconLayoutAlignRight size={16} /> },
  { kind: "top", label: "Căn trên", icon: <IconLayoutAlignTop size={16} /> },
  { kind: "center-v", label: "Giữa dọc", icon: <IconLayoutAlignMiddle size={16} /> },
  { kind: "bottom", label: "Căn dưới", icon: <IconLayoutAlignBottom size={16} /> },
];

export function TextPositionPopover({ ed }: { ed: EditorApi }) {
  return (
    <Popover width={240} position="bottom" withArrow withinPortal shadow="md">
      <Popover.Target>
        <UnstyledButton className="ctx-bar-pill" aria-label="Vị trí">
          <IconArrowsMove size={16} stroke={1.5} />
          <Text size="xs" fw={600}>
            Vị trí
          </Text>
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          <Text size="xs" fw={600}>
            Căn chỉnh theo trang
          </Text>
          <SimpleGrid cols={3} spacing={6}>
            {PAGE_ALIGNS.map((a) => (
              <Tooltip key={a.kind} label={a.label} withArrow>
                <ActionIcon variant="default" size="lg" onClick={() => ed.align(a.kind)}>
                  {a.icon}
                </ActionIcon>
              </Tooltip>
            ))}
          </SimpleGrid>
          <Text size="xs" fw={600}>
            Thứ tự lớp
          </Text>
          <SimpleGrid cols={4} spacing={6}>
            <Tooltip label="Lên trên cùng" withArrow>
              <ActionIcon variant="default" size="lg" onClick={() => ed.order("front")}>
                <IconChevronsUp size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Lên một bậc" withArrow>
              <ActionIcon variant="default" size="lg" onClick={() => ed.order("forward")}>
                <IconChevronUp size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Xuống một bậc" withArrow>
              <ActionIcon variant="default" size="lg" onClick={() => ed.order("backward")}>
                <IconChevronDown size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Xuống dưới cùng" withArrow>
              <ActionIcon variant="default" size="lg" onClick={() => ed.order("back")}>
                <IconChevronsDown size={16} />
              </ActionIcon>
            </Tooltip>
          </SimpleGrid>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
