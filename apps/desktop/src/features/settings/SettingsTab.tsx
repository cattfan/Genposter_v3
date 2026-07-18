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
import { IconCheck, IconDeviceFloppy, IconFolderOpen, IconPlugConnected, IconX } from "@tabler/icons-react";

import { testAi, type AiTestResult } from "../../lib/ai.js";
import { clearMappingCache } from "../../lib/mapping.js";
import { clearPhotoCache } from "../../lib/photos.js";
import { testServerConnection, type ServerTestResult } from "../../lib/server-api.js";
import { invalidateCacheIndex } from "../../lib/sync.js";
import {
  NC_LOCAL_URL,
  setAi,
  setRootDir,
  setServer,
  settings,
  type ServerSettings,
} from "../../lib/settings.js";
import { AppLogo } from "../../components/AppLogo.js";
import "./settings.css";

export function SettingsTab() {
  const [rootDir, setRoot] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [serverLanUrl, setServerLanUrl] = useState("");
  const [serverToken, setServerToken] = useState("");
  const [serverBaseId, setServerBaseId] = useState("");
  const [testing, setTesting] = useState(false);
  const [testingServer, setTestingServer] = useState(false);
  const [testResult, setTestResult] = useState<AiTestResult | null>(null);
  const [serverTest, setServerTest] = useState<ServerTestResult | null>(null);

  useEffect(() => {
    const s = settings();
    setRoot(s.rootDir);
    setBaseUrl(s.ai.baseUrl);
    setApiKey(s.ai.apiKey);
    setModel(s.ai.model);
    setServerUrl(s.server.url);
    setServerLanUrl(s.server.lanUrl);
    setServerToken(s.server.token);
    setServerBaseId(s.server.baseId);
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

  async function doTestServer() {
    setTestingServer(true);
    setServerTest(null);
    const server: ServerSettings = {
      ...settings().server,
      url: serverUrl.trim() || NC_LOCAL_URL,
      lanUrl: serverLanUrl.trim() || NC_LOCAL_URL,
      token: serverToken.trim(),
      baseId: serverBaseId.trim() || settings().server.baseId,
    };
    const r = await testServerConnection(server);
    setServerTest(r);
    setTestingServer(false);
  }

  function saveAll() {
    setRootDir(rootDir);
    setAi({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), model: model.trim() });
    setServer({
      ...settings().server,
      url: serverUrl.trim() || NC_LOCAL_URL,
      lanUrl: serverLanUrl.trim() || NC_LOCAL_URL,
      token: serverToken.trim(),
      baseId: serverBaseId.trim() || settings().server.baseId,
    });
    clearMappingCache();
    clearPhotoCache();
    // rootDir may have changed — the in-memory sync index would otherwise
    // keep serving data cached from the previous project folder.
    invalidateCacheIndex();
    notifications.show({ color: "teal", message: "Đã lưu cài đặt." });
  }

  return (
    <div className="settings-tab">
      <Group className="settings-head" gap="md">
        <AppLogo variant="header" />
        <Box>
          <Title order={3}>Cài đặt</Title>
          <Text size="sm" c="dimmed">
            Thư mục dự án & AI
          </Text>
        </Box>
      </Group>

      <div className="settings-body">
        <Card withBorder radius="lg" padding="lg">
          <Stack gap="sm">
            <div>
              <Title order={5}>Thư mục dự án</Title>
              <Text size="sm" c="dimmed" mt={4}>
                Chứa templates/, recipes/, output/ và cache dữ liệu server. Mỗi máy chọn đúng
                thư mục clone Genposter — không cần copy Excel/ảnh cũ nếu đã đồng bộ từ server.
              </Text>
            </div>
            <TextInput
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
          </Stack>
        </Card>

        <Card withBorder radius="lg" padding="lg">
          <Stack gap="md">
            <div>
              <Title order={5}>Server dữ liệu (NocoDB)</Title>
              <Text size="sm" c="dimmed" mt={4}>
                Hiện mặc định Local Docker (`localhost:8080`). Token + base id xem
                `deploy/CREDENTIALS.local.md`. Khi server LAN/Tailscale bật lại, đổi URL về đó.
              </Text>
            </div>

            <TextInput
              label="URL chính (Local Docker / Tailscale)"
              placeholder={NC_LOCAL_URL}
              value={serverUrl}
              onChange={(e) => setServerUrl(e.currentTarget.value)}
            />
            <TextInput
              label="URL dự phòng (LAN — tùy chọn)"
              placeholder={NC_LOCAL_URL}
              value={serverLanUrl}
              onChange={(e) => setServerLanUrl(e.currentTarget.value)}
            />
            <TextInput
              label="Base ID"
              placeholder="puzatkuv7t0p8ut"
              value={serverBaseId}
              onChange={(e) => setServerBaseId(e.currentTarget.value)}
            />
            <PasswordInput
              label="API token (xc-token)"
              placeholder="dán token từ CREDENTIALS.local.md"
              value={serverToken}
              onChange={(e) => setServerToken(e.currentTarget.value)}
            />

            {serverTest && (
              <Alert
                color={serverTest.ok ? "teal" : "red"}
                icon={serverTest.ok ? <IconCheck size={18} /> : <IconX size={18} />}
                title={
                  serverTest.ok
                    ? `Kết nối OK qua ${
                        serverTest.via === "local"
                          ? "Local Docker"
                          : serverTest.via === "lan"
                            ? "LAN"
                            : "Tailscale"
                      } (${serverTest.ms} ms)`
                    : `Không kết nối được (${serverTest.ms} ms)`
                }
              >
                {serverTest.ok ? serverTest.url : serverTest.error}
              </Alert>
            )}

            <Group justify="flex-end">
              <Button
                variant="default"
                leftSection={<IconPlugConnected size={18} />}
                onClick={() => void doTestServer()}
                loading={testingServer}
              >
                Test server
              </Button>
            </Group>
          </Stack>
        </Card>

        <Card withBorder radius="lg" padding="lg">
          <Stack gap="md">
            <div>
              <Title order={5}>AI API (OpenAI-compatible)</Title>
              <Text size="sm" c="dimmed" mt={4}>
                Dùng cho caption và đổi chữ khi tạo ảnh. Để trống API key = tắt AI.
              </Text>
            </div>

            <TextInput
              label="Base URL"
              placeholder="https://api.deepseek.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.currentTarget.value)}
            />
            <PasswordInput
              label="API key"
              placeholder="sk-…"
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

            <Group justify="flex-end" gap="sm">
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
