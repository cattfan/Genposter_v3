import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  ActionIcon,
  Button,
  Fieldset,
  Group,
  Modal,
  PasswordInput,
  Stack,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconFolderOpen } from "@tabler/icons-react";

import { clearMappingCache } from "../../lib/mapping.js";
import { clearWorkbookCache } from "../../lib/excel.js";
import { clearPhotoCache } from "../../lib/photos.js";
import { setAi, setRootDir, settings } from "../../lib/settings.js";

export function SettingsModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const [rootDir, setRoot] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");

  // Reload current values each time the modal opens.
  useEffect(() => {
    if (!opened) return;
    const s = settings();
    setRoot(s.rootDir);
    setBaseUrl(s.ai.baseUrl);
    setApiKey(s.ai.apiKey);
    setModel(s.ai.model);
  }, [opened]);

  async function pickRoot() {
    const dir = await open({ directory: true, multiple: false });
    if (typeof dir === "string") setRoot(dir);
  }

  function save() {
    setRootDir(rootDir);
    setAi({ baseUrl, apiKey, model });
    clearMappingCache();
    clearWorkbookCache();
    clearPhotoCache();
    onClose();
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Cài đặt" size="lg" centered>
      <Stack gap="md">
        <TextInput
          label="Thư mục dự án"
          description="Chứa data/, templates/, recipes/, output/"
          value={rootDir}
          onChange={(e) => setRoot(e.currentTarget.value)}
          rightSection={
            <Tooltip label="Chọn thư mục…">
              <ActionIcon variant="subtle" onClick={pickRoot}>
                <IconFolderOpen size={18} />
              </ActionIcon>
            </Tooltip>
          }
        />

        <Fieldset legend="AI đổi chữ (tùy chọn — OpenAI-compatible)">
          <Stack gap="sm">
            <TextInput
              label="Base URL"
              placeholder="https://api.openai.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.currentTarget.value)}
            />
            <PasswordInput
              label="API key"
              placeholder="Để trống = tắt AI"
              value={apiKey}
              onChange={(e) => setApiKey(e.currentTarget.value)}
            />
            <TextInput
              label="Model"
              placeholder="gpt-4o-mini"
              value={model}
              onChange={(e) => setModel(e.currentTarget.value)}
            />
          </Stack>
        </Fieldset>

        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={save}>Lưu</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
