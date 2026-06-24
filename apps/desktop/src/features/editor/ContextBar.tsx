import type { ReactNode } from "react";
import { ActionIcon, Group, Paper, Tooltip } from "@mantine/core";
import {
  IconChevronDown,
  IconChevronsDown,
  IconChevronsUp,
  IconChevronUp,
  IconCopy,
  IconLayoutAlignBottom,
  IconLayoutAlignCenter,
  IconLayoutAlignLeft,
  IconLayoutAlignMiddle,
  IconLayoutAlignRight,
  IconLayoutAlignTop,
  IconLayoutDistributeHorizontal,
  IconLayoutDistributeVertical,
  IconLock,
  IconLockOpen,
  IconTrash,
} from "@tabler/icons-react";

import type { AlignKind, EditorApi } from "./useEditor.js";

function IconBtn({
  label,
  onClick,
  children,
  active,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip label={label} withArrow>
      <ActionIcon
        variant={active ? "filled" : "default"}
        size="lg"
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  );
}

const ALIGNS: { kind: AlignKind; label: string; icon: ReactNode }[] = [
  { kind: "left", label: "Căn trái", icon: <IconLayoutAlignLeft size={18} /> },
  { kind: "center-h", label: "Căn giữa ngang", icon: <IconLayoutAlignCenter size={18} /> },
  { kind: "right", label: "Căn phải", icon: <IconLayoutAlignRight size={18} /> },
  { kind: "top", label: "Căn trên", icon: <IconLayoutAlignTop size={18} /> },
  { kind: "center-v", label: "Căn giữa dọc", icon: <IconLayoutAlignMiddle size={18} /> },
  { kind: "bottom", label: "Căn dưới", icon: <IconLayoutAlignBottom size={18} /> },
];

export function ContextBar({ ed }: { ed: EditorApi }) {
  void ed.tick;
  const obj = ed.getActive();
  if (!obj) return null;

  const many = ed.getActiveMany();
  const locked = Boolean((obj as unknown as { gpLocked?: boolean }).gpLocked);

  return (
    <Paper className="context-bar" shadow="sm" radius="md" p={4} withBorder>
      <Group gap={4} wrap="nowrap">
        <ActionIcon.Group>
          {ALIGNS.map((a) => (
            <IconBtn key={a.kind} label={a.label} onClick={() => ed.align(a.kind)}>
              {a.icon}
            </IconBtn>
          ))}
        </ActionIcon.Group>

        <ActionIcon.Group>
          <IconBtn label="Lên trên cùng" onClick={() => ed.order("front")}>
            <IconChevronsUp size={18} />
          </IconBtn>
          <IconBtn label="Lên một bậc" onClick={() => ed.order("forward")}>
            <IconChevronUp size={18} />
          </IconBtn>
          <IconBtn label="Xuống một bậc" onClick={() => ed.order("backward")}>
            <IconChevronDown size={18} />
          </IconBtn>
          <IconBtn label="Xuống dưới cùng" onClick={() => ed.order("back")}>
            <IconChevronsDown size={18} />
          </IconBtn>
        </ActionIcon.Group>

        <IconBtn label="Nhân bản" onClick={() => void ed.duplicateSelected()}>
          <IconCopy size={18} />
        </IconBtn>
        <IconBtn
          label={locked ? "Mở khóa" : "Khóa"}
          active={locked}
          onClick={() => ed.toggleLock()}
        >
          {locked ? <IconLock size={18} /> : <IconLockOpen size={18} />}
        </IconBtn>
        <Tooltip label="Xóa" withArrow>
          <ActionIcon
            variant="light"
            color="red"
            size="lg"
            onClick={() => ed.deleteSelected()}
          >
            <IconTrash size={18} />
          </ActionIcon>
        </Tooltip>

        {many.length >= 3 && (
          <ActionIcon.Group>
            <IconBtn label="Dàn đều ngang" onClick={() => ed.distribute("h")}>
              <IconLayoutDistributeHorizontal size={18} />
            </IconBtn>
            <IconBtn label="Dàn đều dọc" onClick={() => ed.distribute("v")}>
              <IconLayoutDistributeVertical size={18} />
            </IconBtn>
          </ActionIcon.Group>
        )}
      </Group>
    </Paper>
  );
}
