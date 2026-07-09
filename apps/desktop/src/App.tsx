import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Box, Button, Stack, Text, Title } from "@mantine/core";
import {
  IconFolderOpen,
  IconLayoutBoardSplit,
  IconPhoto,
  IconSettings,
  IconTable,
} from "@tabler/icons-react";

import { AppRail } from "./components/AppRail.js";
import { AppLogo } from "./components/AppLogo.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { DesignWorkspace } from "./features/editor/DesignWorkspace.js";
import { DataTab } from "./features/data/DataTab.js";
import { ProduceTab } from "./features/produce/ProduceTab.js";
import { SettingsTab } from "./features/settings/SettingsTab.js";
import { hideDataStaleToast, showDataStaleToast } from "./lib/data-stale-toast.js";
import { isRootDirConfigured, setRootDir } from "./lib/settings.js";
import { onUpdateStatus, startUpdatePolling } from "./lib/update-poller.js";

type TabId = "design" | "produce" | "data" | "settings";

const TABS = [
  { id: "design" as const, label: "Thiết kế", Icon: IconLayoutBoardSplit },
  { id: "produce" as const, label: "Tạo ảnh", Icon: IconPhoto },
  { id: "data" as const, label: "Dữ liệu", Icon: IconTable },
  { id: "settings" as const, label: "Cài đặt", Icon: IconSettings },
];

function tabStyle(active: boolean): React.CSSProperties {
  // minWidth/minHeight: 0 override the flex-item default of `min-width: auto`,
  // which otherwise lets wide content (e.g. the Data grid) push past the
  // panel instead of scrolling inside it.
  return { display: active ? "flex" : "none", flex: 1, minWidth: 0, minHeight: 0 };
}

function RootDirSetup({ onConfigured }: { onConfigured: () => void }) {
  async function pickProjectRoot() {
    const dir = await open({ directory: true, multiple: false });
    if (typeof dir !== "string") return;
    setRootDir(dir);
    onConfigured();
  }

  return (
    <div className="root-setup">
      <Stack align="center" gap="lg" maw={480}>
        <AppLogo variant="banner" />
        <Box ta="center">
          <Title order={2}>Chọn thư mục dự án</Title>
          <Text c="dimmed" mt="sm">
            Trỏ tới thư mục clone Genposter (chứa templates/, recipes/, output/). Mỗi máy
            chọn đúng thư mục của mình — dữ liệu quán sẽ đồng bộ từ server sau khi cấu hình.
          </Text>
        </Box>
        <Button
          size="md"
          leftSection={<IconFolderOpen size={18} />}
          onClick={() => void pickProjectRoot()}
        >
          Chọn thư mục…
        </Button>
      </Stack>
    </div>
  );
}

export function App() {
  const [tab, setTab] = useState<TabId>("design");
  const [dataStale, setDataStale] = useState(false);
  const [rootReady, setRootReady] = useState(isRootDirConfigured);

  useEffect(() => {
    if (!rootReady) return;
    startUpdatePolling();
    // Only genuine server-side changes count — offline must not raise the toast.
    return onUpdateStatus((st) => setDataStale(st.stale));
  }, [rootReady]);

  useEffect(() => {
    // Ctrl+wheel / Ctrl+± normally zoom the whole page (browser/WebView2),
    // scaling every panel and toolbar. Block that app-wide — the editor stage
    // has its own Ctrl+wheel handler that zooms just the canvas.
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["+", "=", "-", "_", "0"].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!rootReady || !dataStale || tab === "data") {
      hideDataStaleToast();
      return;
    }
    showDataStaleToast({
      actionLabel: "Cập nhật",
      onAction: () => setTab("data"),
    });
  }, [dataStale, tab, rootReady]);

  if (!rootReady) {
    return <RootDirSetup onConfigured={() => setRootReady(true)} />;
  }

  return (
    <div className="app">
      <AppRail
        tabs={TABS}
        active={tab}
        onChange={(id) => {
          if (id === "data") hideDataStaleToast();
          setTab(id as TabId);
        }}
      />

      <main className="main">
        <Box className="main-stage">
          <div style={tabStyle(tab === "design")}>
            <ErrorBoundary label="Thiết kế">
              <DesignWorkspace />
            </ErrorBoundary>
          </div>
          <div style={tabStyle(tab === "produce")}>
            <ErrorBoundary label="Tạo ảnh">
              <ProduceTab active={tab === "produce"} />
            </ErrorBoundary>
          </div>
          <div style={tabStyle(tab === "data")}>
            <ErrorBoundary label="Dữ liệu">
              <DataTab />
            </ErrorBoundary>
          </div>
          <div style={tabStyle(tab === "settings")}>
            <ErrorBoundary label="Cài đặt">
              <SettingsTab />
            </ErrorBoundary>
          </div>
        </Box>
      </main>
    </div>
  );
}
