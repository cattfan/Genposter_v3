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
  const title = obj ? (TYPE_LABELS[obj.type?.toLowerCase() ?? ""] ?? "Đối tượng") : "Đối tượng";

  return (
    <aside className="panel inspector-dock">
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Text fw={600} size="sm">
          {title}
        </Text>
        <ActionIcon variant="subtle" color="gray" onClick={onClose} aria-label="Đóng bảng thuộc tính">
          <IconX size={18} />
        </ActionIcon>
      </Group>
      <PropertiesPanel ed={ed} embedded />
    </aside>
  );
}

const TYPE_LABELS: Record<string, string> = {
  textbox: "Văn bản",
  "i-text": "Văn bản",
  text: "Văn bản",
  image: "Ảnh",
  rect: "Khối chữ nhật",
  circle: "Hình tròn",
  line: "Đường kẻ",
  group: "Nhóm",
  activeselection: "Nhiều đối tượng",
};
