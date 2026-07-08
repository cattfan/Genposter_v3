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

import { getBool, getId, getStr } from "../../lib/fabric-util.js";
import { LayerPreview } from "./layer-preview.js";
import { isPageFrame } from "./pasteboard.js";
import type { EditorApi } from "./useEditor.js";

export function LayersPanel({ ed }: { ed: EditorApi }) {
  void ed.tick;
  const objs = [...ed.getObjects()].reverse().filter((o) => !isPageFrame(o));
  const active = ed.getActive();
  const groups = ed.getDataGroups();

  if (!objs.length) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">
        Chưa có đối tượng nào.
      </Text>
    );
  }

  return (
    <ScrollArea.Autosize mah={320}>
      <Stack gap={2}>
        {objs.map((o) => {
          const id = getId(o);
          const label = getStr(o, "gpLabel") || (o.type ?? "obj");
          const dg = getStr(o, "gpDataGroup");
          const groupLabel = dg ? groups.find((g) => g.id === dg)?.label : "";
          const locked = getBool(o, "gpLocked");
          const isActive = active === o;
          return (
            <Group
              key={id}
              gap={6}
              wrap="nowrap"
              px="xs"
              py={4}
              onClick={() => ed.selectObject(o)}
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
            </Group>
          );
        })}
      </Stack>
    </ScrollArea.Autosize>
  );
}
