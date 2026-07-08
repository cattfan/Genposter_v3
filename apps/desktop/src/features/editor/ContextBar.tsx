import type { ReactNode } from "react";
import * as fabric from "fabric";
import { Divider, Group, Tooltip, UnstyledButton } from "@mantine/core";
import { IconStack2, IconStackPop } from "@tabler/icons-react";

import { isImageType, isTextType } from "../../lib/fabric-util.js";
import { ContextBarQuickActions } from "./ContextBarQuickActions.js";
import { ImageContextBar } from "./ImageContextBar.js";
import { OpacityPopover } from "./OpacityPopover.js";
import { PositionPopover } from "./PositionPopover.js";
import { ShapeContextBar } from "./ShapeContextBar.js";
import { TextContextBar } from "./TextContextBar.js";
import type { EditorApi } from "./useEditor.js";

const SHAPE_TYPES = new Set(["rect", "circle", "ellipse", "triangle", "line"]);

function BarBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip label={label} withArrow>
      <UnstyledButton
        className="ctx-bar-icon-btn"
        aria-label={label}
        onClick={onClick}
      >
        {children}
      </UnstyledButton>
    </Tooltip>
  );
}

/** Bar for multi-selections and groups: shared controls only. */
function SelectionContextBar({ ed, obj }: { ed: EditorApi; obj: fabric.Object }) {
  const isGroup = obj.type === "group";
  const isMulti = obj.type === "activeselection" && ed.getActiveMany().length >= 2;
  const up = (p: Record<string, unknown>) => ed.updateActive(p);

  return (
    <Group gap={6} wrap="nowrap" className="ctx-bar-row">
      {isMulti && (
        <BarBtn label="Gom nhóm" onClick={() => ed.groupLayout()}>
          <IconStack2 size={18} stroke={1.5} />
        </BarBtn>
      )}
      {isGroup && (
        <>
          <OpacityPopover obj={obj} onPatch={up} />
          <BarBtn label="Tách nhóm" onClick={() => ed.ungroupLayout()}>
            <IconStackPop size={18} stroke={1.5} />
          </BarBtn>
        </>
      )}
      <PositionPopover ed={ed} />
      <Divider orientation="vertical" className="ctx-bar-divider" />
      <ContextBarQuickActions ed={ed} showLock={isGroup || isMulti} />
    </Group>
  );
}

export function ContextBar({ ed }: { ed: EditorApi }) {
  void ed.tick;
  const obj = ed.getActive();
  const many = ed.getActiveMany();

  let bar: ReactNode = null;
  if (obj) {
    const type = obj.type ?? "";
    if (many.length > 1 && many.every(isTextType)) {
      bar = <TextContextBar ed={ed} text={many[0] as fabric.Textbox} />;
    } else if (many.length > 1 && many.every(isImageType)) {
      bar = <ImageContextBar ed={ed} obj={many[0]!} />;
    } else if (many.length > 1 && many.every((o) => SHAPE_TYPES.has(o.type ?? ""))) {
      bar = <ShapeContextBar ed={ed} obj={many[0]!} />;
    } else if (isTextType(obj)) bar = <TextContextBar ed={ed} text={obj as fabric.Textbox} />;
    else if (isImageType(obj)) bar = <ImageContextBar ed={ed} obj={obj} />;
    else if (SHAPE_TYPES.has(type)) bar = <ShapeContextBar ed={ed} obj={obj} />;
    else if (type === "activeselection" || type === "group")
      bar = <SelectionContextBar ed={ed} obj={obj} />;
  }

  return <div className="context-bar-strip">{bar}</div>;
}
