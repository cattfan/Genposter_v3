import { Tooltip, UnstyledButton } from "@mantine/core";
import { IconCopy, IconLock, IconLockOpen, IconTrash } from "@tabler/icons-react";

import { getBool } from "../../lib/fabric-util.js";
import type { EditorApi } from "./useEditor.js";

function Btn({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip label={label} withArrow>
      <UnstyledButton
        className={`ctx-bar-icon-btn${active ? " ctx-bar-icon-btn--active" : ""}`}
        aria-label={label}
        onClick={onClick}
      >
        {children}
      </UnstyledButton>
    </Tooltip>
  );
}

/** Duplicate / lock / delete shortcuts shown at the end of every context bar. */
export function ContextBarQuickActions({
  ed,
  showLock = true,
}: {
  ed: EditorApi;
  showLock?: boolean;
}) {
  void ed.tick;
  const obj = ed.getActive();
  const locked = obj ? getBool(obj, "gpLocked") : false;

  return (
    <>
      <Btn label="Nhân bản (Ctrl+D)" onClick={() => void ed.duplicateSelected()}>
        <IconCopy size={18} stroke={1.5} />
      </Btn>
      {showLock && (
        <Btn label={locked ? "Mở khoá" : "Khoá"} active={locked} onClick={() => ed.toggleLock()}>
          {locked ? <IconLock size={18} stroke={1.5} /> : <IconLockOpen size={18} stroke={1.5} />}
        </Btn>
      )}
      <Btn label="Xoá (Del)" onClick={() => ed.deleteSelected()}>
        <IconTrash size={18} stroke={1.5} />
      </Btn>
    </>
  );
}
