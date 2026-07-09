import {
  ActionIcon,
  Group,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconEye,
  IconEyeOff,
  IconLock,
} from "@tabler/icons-react";
import type * as fabric from "fabric";

import { getBool, getId, getStr, isGroupObject } from "../../lib/fabric-util.js";
import { LayerPreview } from "./layer-preview.js";
import { isPageFrame } from "./pasteboard.js";
import type { EditorApi } from "./useEditor.js";

interface LayerRow {
  obj: fabric.Object;
  depth: number;
}

/** Top-to-bottom layer list: top-level objects (reversed), children indented. */
function buildLayerRows(topLevel: fabric.Object[]): LayerRow[] {
  const out: LayerRow[] = [];
  const walk = (objs: fabric.Object[], depth: number) => {
    for (const o of [...objs].reverse()) {
      if (isPageFrame(o)) continue;
      out.push({ obj: o, depth });
      if (isGroupObject(o)) walk(o.getObjects(), depth + 1);
    }
  };
  walk(topLevel, 0);
  return out;
}

function topSelectable(obj: fabric.Object): fabric.Object {
  let cur = obj;
  while (cur.group) cur = cur.group as fabric.Object;
  return cur;
}

export function LayersPanel({ ed }: { ed: EditorApi }) {
  void ed.tick;
  const rows = buildLayerRows(ed.getObjects());
  const active = ed.getActive();
  const groups = ed.getDataGroups();

  if (!rows.length) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">
        Chưa có đối tượng nào.
      </Text>
    );
  }

  return (
    <ScrollArea.Autosize mah={320}>
      <Stack gap={2}>
        {rows.map(({ obj: o, depth }) => {
          const id = getId(o);
          const label =
            getStr(o, "gpLabel") ||
            (isGroupObject(o) ? "Nhóm layout" : (o.type ?? "obj"));
          const dg = getStr(o, "gpDataGroup");
          const groupLabel = dg ? groups.find((g) => g.id === dg)?.label : "";
          const locked = getBool(o, "gpLocked");
          const top = topSelectable(o);
          const isActive = active === o || active === top;
          return (
            <Group
              key={id}
              gap={6}
              wrap="nowrap"
              px="xs"
              py={4}
              pl={8 + depth * 14}
              onClick={() => ed.selectObject(top)}
              className={`layer-row${isActive ? " layer-row--active" : ""}`}
            >
              <LayerPreview obj={o} />
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  ed.toggleVisible(o);
                }}
              >
                {o.visible ? <IconEye size={16} /> : <IconEyeOff size={16} />}
              </ActionIcon>
              <Text
                size="sm"
                truncate
                c={isActive ? "riviu.7" : undefined}
                style={{ flex: 1, minWidth: 0 }}
              >
                {groupLabel ? `[${groupLabel}] ` : dg ? `[${dg}] ` : ""}
                {label}
              </Text>
              {locked && <IconLock size={14} color="var(--mantine-color-dimmed)" />}
              {depth === 0 && (
                <>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      ed.selectObject(o);
                      ed.order("forward");
                    }}
                  >
                    <IconChevronUp size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      ed.selectObject(o);
                      ed.order("backward");
                    }}
                  >
                    <IconChevronDown size={16} />
                  </ActionIcon>
                </>
              )}
            </Group>
          );
        })}
      </Stack>
    </ScrollArea.Autosize>
  );
}
