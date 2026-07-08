import { useEffect, useState } from "react";
import { Box } from "@mantine/core";
import {
  IconLayoutBoardSplit,
  IconPhoto,
  IconSettings,
  IconTable,
} from "@tabler/icons-react";

import { AppRail } from "./components/AppRail.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { DesignWorkspace } from "./features/editor/DesignWorkspace.js";
import { DataTab } from "./features/data/DataTab.js";
import { ProduceTab } from "./features/produce/ProduceTab.js";
import { SettingsTab } from "./features/settings/SettingsTab.js";
import { hideDataStaleToast, showDataStaleToast } from "./lib/data-stale-toast.js";
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

export function App() {
  const [tab, setTab] = useState<TabId>("design");
  const [dataStale, setDataStale] = useState(false);

  useEffect(() => {
    startUpdatePolling();
    // Only genuine server-side changes count — offline must not raise the toast.
    return onUpdateStatus((st) => setDataStale(st.stale));
  }, []);

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
    if (!dataStale || tab === "data") {
      hideDataStaleToast();
      return;
    }
    showDataStaleToast({
      actionLabel: "Cập nhật",
      onAction: () => setTab("data"),
    });
  }, [dataStale, tab]);

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
