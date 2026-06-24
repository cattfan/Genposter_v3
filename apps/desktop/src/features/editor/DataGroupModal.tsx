import { useState } from "react";
import { Button, Group, Modal, SegmentedControl, Stack, TextInput } from "@mantine/core";
import type { DataGroupDef } from "@genposter/schema";

import type { EditorApi } from "./useEditor.js";

export function DataGroupModal({
  opened,
  onClose,
  ed,
  defaultMode = "slot",
}: {
  opened: boolean;
  onClose: () => void;
  ed: EditorApi;
  defaultMode?: DataGroupDef["mode"];
}) {
  const [label, setLabel] = useState("Nhóm mới");
  const [mode, setMode] = useState<DataGroupDef["mode"]>(defaultMode);

  return (
    <Modal opened={opened} onClose={onClose} title="Gom nhóm dữ liệu" centered size="sm">
      <Stack gap="sm">
        <TextInput
          label="Tên nhóm"
          value={label}
          onChange={(e) => setLabel(e.currentTarget.value)}
          placeholder="Quán 1"
        />
        <SegmentedControl
          value={mode}
          onChange={(v) => setMode(v as DataGroupDef["mode"])}
          data={[
            { value: "slot", label: "1 item cố định" },
            { value: "repeat", label: "Lặp danh sách" },
          ]}
          fullWidth
        />
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            onClick={() => {
              if (ed.createDataGroup(label.trim() || "Nhóm mới", mode)) onClose();
            }}
          >
            Tạo nhóm
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
