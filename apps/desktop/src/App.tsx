import { useState } from "react";
import { Box, Stack, Text, ThemeIcon, Tooltip, UnstyledButton } from "@mantine/core";
import {
  IconLayoutBoardSplit,
  IconPhoto,
  IconSettings,
  IconTable,
  type IconProps,
} from "@tabler/icons-react";

import { DesignWorkspace } from "./features/editor/DesignWorkspace.js";
import { DataTab } from "./features/data/DataTab.js";
import { ProduceTab } from "./features/produce/ProduceTab.js";
import { SettingsTab } from "./features/settings/SettingsTab.js";

type TabId = "design" | "produce" | "data" | "settings";

const TABS: {
  id: TabId;
  label: string;
  Icon: React.ComponentType<IconProps>;
}[] = [
  { id: "design", label: "Thiết kế", Icon: IconLayoutBoardSplit },
  { id: "produce", label: "Tạo ảnh", Icon: IconPhoto },
  { id: "data", label: "Dữ liệu", Icon: IconTable },
  { id: "settings", label: "Cài đặt", Icon: IconSettings },
];

export function App() {
  const [tab, setTab] = useState<TabId>("design");

  return (
    <div className="app">
      <Box component="aside" className="rail">
        <ThemeIcon size={42} radius="md" variant="filled" mb="sm">
          <Text fw={800} fz={18}>
            G
          </Text>
        </ThemeIcon>

        <Stack gap={6} w="100%" align="center">
          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <Tooltip key={id} label={label} position="right" withArrow>
                <UnstyledButton
                  className="rail-btn"
                  data-active={active || undefined}
                  onClick={() => setTab(id)}
                >
                  <ThemeIcon
                    size={38}
                    radius="md"
                    variant={active ? "filled" : "light"}
                    color={active ? "riviu" : "gray"}
                  >
                    <Icon size={20} />
                  </ThemeIcon>
                  <Text fz={10} fw={600} mt={3} c={active ? "riviu" : "dimmed"}>
                    {label}
                  </Text>
                </UnstyledButton>
              </Tooltip>
            );
          })}
        </Stack>
      </Box>

      <main className="main">
        {/* Keep editor + produce mounted so canvas state and generated sets
            survive tab switches. */}
        <div
          style={{
            display: tab === "design" ? "flex" : "none",
            flex: 1,
            minHeight: 0,
          }}
        >
          <DesignWorkspace />
        </div>
        <div
          style={{
            display: tab === "produce" ? "flex" : "none",
            flex: 1,
            minHeight: 0,
          }}
        >
          <ProduceTab />
        </div>
        {tab === "data" && <DataTab />}
        {tab === "settings" && <SettingsTab />}
      </main>
    </div>
  );
}
