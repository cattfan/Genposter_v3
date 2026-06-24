import { ActionIcon, Group, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useEffect } from "react";

import { PropertiesPanel } from "./PropertiesPanel.js";
import type { EditorApi } from "./useEditor.js";

export function InspectorDrawer({
  ed,
  onClose,
}: {
  ed: EditorApi;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  void ed.tick;
  const obj = ed.getActive();
  const title = obj?.type ?? "Đối tượng";

  return (
    <aside className="panel inspector-dock">
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Text fw={600} size="sm" tt="capitalize">
          {title}
        </Text>
        <ActionIcon variant="subtle" color="gray" onClick={onClose} aria-label="Đóng inspector">
          <IconX size={18} />
        </ActionIcon>
      </Group>
      <PropertiesPanel ed={ed} embedded />
    </aside>
  );
}
