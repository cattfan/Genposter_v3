import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Card,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconDeviceFloppy,
  IconFolderOpen,
  IconPlugConnected,
  IconX,
} from "@tabler/icons-react";

import { testAi, type AiTestResult } from "../../lib/ai.js";
import { clearMappingCache } from "../../lib/mapping.js";
import { clearWorkbookCache } from "../../lib/excel.js";
import { clearPhotoCache } from "../../lib/photos.js";
import { setAi, setRootDir, settings } from "../../lib/settings.js";
import "./settings.css";

export function SettingsTab() {
  const [rootDir, setRoot] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<AiTestResult | null>(null);

  useEffect(() => {
    const s = settings();
    setRoot(s.rootDir);
    setBaseUrl(s.ai.baseUrl);
    setApiKey(s.ai.apiKey);
    setModel(s.ai.model);
  }, []);

  async function pickRoot() {
    const dir = await open({ directory: true, multiple: false });
    if (typeof dir === "string") setRoot(dir);
  }

  async function doTest() {
    setTesting(true);
    setTestResult(null);
    const r = await testAi({ baseUrl, apiKey, model });
    setTestResult(r);
    setTesting(false);
  }

  function saveAll() {
    setRootDir(rootDir);
    setAi({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), model: model.trim() });
    clearMappingCache();
    clearWorkbookCache();
    clearPhotoCache();
    notifications.show({ color: "teal", message: "Đã lưu cài đặt." });
  }

  return (
    <div className="settings-tab">
      <Group className="settings-head" align="center">
        <Box>
          <Title order={3}>Cài đặt</Title>
          <Text c="dimmed" size="sm">
            Thư mục dự án và AI API dùng cho caption / đổi chữ
          </Text>
        </Box>
      </Group>

      <div className="settings-body">
        <Card withBorder radius="lg" padding="lg">
          <Title order={5} mb="sm">
            Thư mục dự án
          </Title>
          <TextInput
            description="Chứa data/, templates/, recipes/, output/"
            value={rootDir}
            onChange={(e) => setRoot(e.currentTarget.value)}
            rightSection={
              <Tooltip label="Chọn thư mục…">
                <ActionIcon variant="subtle" onClick={() => void pickRoot()}>
                  <IconFolderOpen size={18} />
                </ActionIcon>
              </Tooltip>
            }
          />
        </Card>

        <Card withBorder radius="lg" padding="lg">
          <Title order={5} mb="sm">
            AI API (OpenAI-compatible)
          </Title>
          <Stack gap="sm">
            <TextInput
              label="Base URL"
              placeholder="https://api.deepseek.com"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.currentTarget.value)}
            />
            <PasswordInput
              label="API key"
              placeholder="sk-…  (để trống = tắt AI)"
              value={apiKey}
              onChange={(e) => setApiKey(e.currentTarget.value)}
            />
            <TextInput
              label="Model"
              placeholder="deepseek-chat"
              value={model}
              onChange={(e) => setModel(e.currentTarget.value)}
            />

            {testResult && (
              <Alert
                color={testResult.ok ? "teal" : "red"}
                icon={testResult.ok ? <IconCheck size={18} /> : <IconX size={18} />}
                title={testResult.ok ? `Kết nối OK (${testResult.ms} ms)` : `Lỗi (${testResult.ms} ms)`}
              >
                {testResult.ok ? `Model trả lời: "${testResult.reply}"` : testResult.error}
              </Alert>
            )}

            <Group justify="flex-end" mt="xs">
              <Button
                variant="default"
                leftSection={<IconPlugConnected size={18} />}
                onClick={() => void doTest()}
                loading={testing}
              >
                Test kết nối
              </Button>
              <Button leftSection={<IconDeviceFloppy size={18} />} onClick={saveAll}>
                Lưu
              </Button>
            </Group>
          </Stack>
        </Card>
      </div>
    </div>
  );
}
