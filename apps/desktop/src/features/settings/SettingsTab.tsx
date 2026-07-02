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
  Progress,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconCloudDownload,
  IconDeviceFloppy,
  IconFolderOpen,
  IconPlugConnected,
  IconX,
} from "@tabler/icons-react";

import { testAi, type AiTestResult } from "../../lib/ai.js";
import { clearMappingCache } from "../../lib/mapping.js";
import { clearWorkbookCache } from "../../lib/excel.js";
import { clearPhotoCache } from "../../lib/photos.js";
import { testServer } from "../../lib/server-api.js";
import { setAi, setRootDir, setServer, settings } from "../../lib/settings.js";
import { syncProvince } from "../../lib/sync.js";
import "./settings.css";

export function SettingsTab() {
  const [rootDir, setRoot] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");

  const [srvUrl, setSrvUrl] = useState("");
  const [srvToken, setSrvToken] = useState("");
  const [srvBaseId, setSrvBaseId] = useState("");
  const [srvProvince, setSrvProvince] = useState("dalat");
  const [srvSource, setSrvSource] = useState<"excel" | "server">("excel");

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<AiTestResult | null>(null);
  const [srvTesting, setSrvTesting] = useState(false);
  const [srvResult, setSrvResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProg, setSyncProg] = useState({ done: 0, total: 0 });

  useEffect(() => {
    const s = settings();
    setRoot(s.rootDir);
    setBaseUrl(s.ai.baseUrl);
    setApiKey(s.ai.apiKey);
    setModel(s.ai.model);
    setSrvUrl(s.server.url);
    setSrvToken(s.server.token);
    setSrvBaseId(s.server.baseId);
    setSrvProvince(s.server.province);
    setSrvSource(s.server.source);
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

  function serverSettings() {
    return {
      url: srvUrl.trim().replace(/\/$/, ""),
      token: srvToken.trim(),
      baseId: srvBaseId.trim(),
      province: srvProvince.trim() || "dalat",
      source: srvSource,
    };
  }

  async function doTestServer() {
    setSrvTesting(true);
    setSrvResult(null);
    const t0 = performance.now();
    try {
      const tables = await testServer(serverSettings());
      setSrvResult({
        ok: true,
        msg: `OK (${Math.round(performance.now() - t0)} ms) — ${tables.length} bảng: ${tables.slice(0, 5).join(", ")}…`,
      });
    } catch (e) {
      setSrvResult({ ok: false, msg: String(e instanceof Error ? e.message : e) });
    } finally {
      setSrvTesting(false);
    }
  }

  async function doSync() {
    saveAll(false);
    setSyncing(true);
    setSyncProg({ done: 0, total: 0 });
    try {
      const r = await syncProvince({
        onProgress: (done, total) => setSyncProg({ done, total }),
      });
      notifications.show({
        color: "teal",
        message: `Đồng bộ xong: ${r.rows} dòng, tải ${r.photosDownloaded} ảnh mới, giữ ${r.photosKept} ảnh cũ${r.removedRecords ? `, dọn ${r.removedRecords} mục đã xoá` : ""}.`,
      });
    } catch (e) {
      notifications.show({ color: "red", message: `Lỗi đồng bộ: ${String(e)}` });
    } finally {
      setSyncing(false);
    }
  }

  function saveAll(notify = true) {
    setRootDir(rootDir);
    setAi({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), model: model.trim() });
    setServer(serverSettings());
    clearMappingCache();
    clearWorkbookCache();
    clearPhotoCache();
    if (notify) notifications.show({ color: "teal", message: "Đã lưu cài đặt." });
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
            Server dữ liệu (NocoDB)
          </Title>
          <Stack gap="sm">
            <Box>
              <Text size="sm" fw={500} mb={4}>
                Nguồn dữ liệu tab Tạo ảnh
              </Text>
              <SegmentedControl
                value={srvSource}
                onChange={(v) => setSrvSource(v as "excel" | "server")}
                data={[
                  { value: "excel", label: "Excel local" },
                  { value: "server", label: "Server (cache đã đồng bộ)" },
                ]}
              />
            </Box>
            <TextInput
              label="URL server"
              placeholder="http://180.93.114.89:8080"
              value={srvUrl}
              onChange={(e) => setSrvUrl(e.currentTarget.value)}
            />
            <Group grow>
              <PasswordInput
                label="API token (xc-token)"
                placeholder="token chỉ-đọc của app"
                value={srvToken}
                onChange={(e) => setSrvToken(e.currentTarget.value)}
              />
              <TextInput
                label="Base ID"
                placeholder="prv…"
                value={srvBaseId}
                onChange={(e) => setSrvBaseId(e.currentTarget.value)}
              />
              <TextInput
                label="Tỉnh"
                placeholder="dalat"
                value={srvProvince}
                onChange={(e) => setSrvProvince(e.currentTarget.value)}
              />
            </Group>

            {srvResult && (
              <Alert
                color={srvResult.ok ? "teal" : "red"}
                icon={srvResult.ok ? <IconCheck size={18} /> : <IconX size={18} />}
              >
                {srvResult.msg}
              </Alert>
            )}
            {syncing && syncProg.total > 0 && (
              <Progress value={(syncProg.done / syncProg.total) * 100} animated />
            )}

            <Group justify="flex-end">
              <Button
                variant="default"
                leftSection={<IconPlugConnected size={18} />}
                onClick={() => void doTestServer()}
                loading={srvTesting}
              >
                Test server
              </Button>
              <Button
                variant="light"
                leftSection={<IconCloudDownload size={18} />}
                onClick={() => void doSync()}
                loading={syncing}
              >
                Đồng bộ về máy
              </Button>
            </Group>
          </Stack>
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
              <Button leftSection={<IconDeviceFloppy size={18} />} onClick={() => saveAll()}>
                Lưu
              </Button>
            </Group>
          </Stack>
        </Card>
      </div>
    </div>
  );
}
