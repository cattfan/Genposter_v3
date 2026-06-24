import { useEffect, useState, type ReactNode } from "react";
import type { FabricObject } from "fabric";
import { Menu } from "@mantine/core";
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

const ALIGNS: { kind: AlignKind; label: string; icon: ReactNode }[] = [
  { kind: "left", label: "Căn trái", icon: <IconLayoutAlignLeft size={14} /> },
  { kind: "center-h", label: "Căn giữa ngang", icon: <IconLayoutAlignCenter size={14} /> },
  { kind: "right", label: "Căn phải", icon: <IconLayoutAlignRight size={14} /> },
  { kind: "top", label: "Căn trên", icon: <IconLayoutAlignTop size={14} /> },
  { kind: "center-v", label: "Căn giữa dọc", icon: <IconLayoutAlignMiddle size={14} /> },
  { kind: "bottom", label: "Căn dưới", icon: <IconLayoutAlignBottom size={14} /> },
];

export function CanvasContextMenu({ ed }: { ed: EditorApi }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = ed.getCanvas();
    if (!canvas || !ed.ready) return;

    const onContextMenu = (opt: { e: Event; target?: FabricObject }) => {
      const evt = opt.e as MouseEvent;
      evt.preventDefault();

      if (opt.target) {
        canvas.setActiveObject(opt.target);
        canvas.requestRenderAll();
      }

      if (!canvas.getActiveObject()) {
        setPos(null);
        return;
      }

      setPos({ x: evt.clientX, y: evt.clientY });
    };

    canvas.on("contextmenu", onContextMenu);
    return () => {
      canvas.off("contextmenu", onContextMenu);
    };
  }, [ed, ed.ready]);

  void ed.tick;
  const obj = ed.getActive();
  const many = ed.getActiveMany();
  const locked = Boolean((obj as unknown as { gpLocked?: boolean } | null)?.gpLocked);
  const opened = pos !== null && obj !== null;

  const close = () => setPos(null);
  const run = (fn: () => void) => () => {
    fn();
    close();
  };

  return (
    <Menu
      opened={opened}
      onChange={(next) => {
        if (!next) close();
      }}
      withinPortal
      position="right-start"
      closeOnItemClick
      shadow="md"
    >
      <Menu.Target>
        <div
          aria-hidden
          style={{
            position: "fixed",
            left: pos?.x ?? -9999,
            top: pos?.y ?? -9999,
            width: 1,
            height: 1,
            pointerEvents: "none",
          }}
        />
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Căn chỉnh</Menu.Label>
        {ALIGNS.map((a) => (
          <Menu.Item key={a.kind} leftSection={a.icon} onClick={run(() => ed.align(a.kind))}>
            {a.label}
          </Menu.Item>
        ))}

        <Menu.Divider />
        <Menu.Label>Thứ tự lớp</Menu.Label>
        <Menu.Item
          leftSection={<IconChevronsUp size={14} />}
          onClick={run(() => ed.order("front"))}
        >
          Lên trên cùng
        </Menu.Item>
        <Menu.Item
          leftSection={<IconChevronUp size={14} />}
          onClick={run(() => ed.order("forward"))}
        >
          Lên một bậc
        </Menu.Item>
        <Menu.Item
          leftSection={<IconChevronDown size={14} />}
          onClick={run(() => ed.order("backward"))}
        >
          Xuống một bậc
        </Menu.Item>
        <Menu.Item
          leftSection={<IconChevronsDown size={14} />}
          onClick={run(() => ed.order("back"))}
        >
          Xuống dưới cùng
        </Menu.Item>

        <Menu.Divider />
        <Menu.Item
          leftSection={<IconCopy size={14} />}
          onClick={run(() => void ed.duplicateSelected())}
        >
          Nhân bản
        </Menu.Item>
        <Menu.Item
          leftSection={locked ? <IconLock size={14} /> : <IconLockOpen size={14} />}
          onClick={run(() => ed.toggleLock())}
        >
          {locked ? "Mở khóa" : "Khóa"}
        </Menu.Item>
        <Menu.Item
          color="red"
          leftSection={<IconTrash size={14} />}
          onClick={run(() => ed.deleteSelected())}
        >
          Xóa
        </Menu.Item>

        {many.length >= 3 && (
          <>
            <Menu.Divider />
            <Menu.Label>Dàn đều</Menu.Label>
            <Menu.Item
              leftSection={<IconLayoutDistributeHorizontal size={14} />}
              onClick={run(() => ed.distribute("h"))}
            >
              Dàn đều ngang
            </Menu.Item>
            <Menu.Item
              leftSection={<IconLayoutDistributeVertical size={14} />}
              onClick={run(() => ed.distribute("v"))}
            >
              Dàn đều dọc
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
