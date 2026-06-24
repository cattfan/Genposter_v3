import { ActionIcon, Box, Group, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useEffect } from "react";

import { PropertiesPanel } from "./PropertiesPanel.js";
import type { EditorApi } from "./useEditor.js";

export function InspectorDrawer({
  ed,
  opened,
  onClose,
}: {
  ed: EditorApi;
  opened: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!opened) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opened, onClose]);

  if (!opened) return null;

  const obj = ed.getActive();
  const title = obj?.type ?? "Đối tượng";

  return (
    <>
      <div className="inspector-backdrop" onClick={onClose} aria-hidden />
      <aside className="inspector-drawer">
        <Group justify="space-between" mb="sm" wrap="nowrap">
          <Text fw={600} size="sm" tt="capitalize">
            {title}
          </Text>
          <ActionIcon variant="subtle" color="gray" onClick={onClose}>
            <IconX size={18} />
          </ActionIcon>
        </Group>
        <Box className="inspector-drawer-body">
          <PropertiesPanel ed={ed} embedded />
        </Box>
      </aside>
    </>
  );
}
