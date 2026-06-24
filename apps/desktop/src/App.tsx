import { useState } from "react";
import {
  ActionIcon,
  Box,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconLayoutBoardSplit,
  IconPhoto,
  IconSettings,
  type IconProps,
} from "@tabler/icons-react";

import { DesignWorkspace } from "./features/editor/DesignWorkspace.js";
import { ProduceTab } from "./features/produce/ProduceTab.js";
import { SettingsModal } from "./features/settings/SettingsModal.js";

type TabId = "design" | "produce";

const TABS: {
  id: TabId;
  label: string;
  Icon: React.ComponentType<IconProps>;
}[] = [
  { id: "design", label: "Thiết kế", Icon: IconLayoutBoardSplit },
  { id: "produce", label: "Tạo ảnh", Icon: IconPhoto },
];

export function App() {
  const [tab, setTab] = useState<TabId>("design");
  const [showSettings, setShowSettings] = useState(false);

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

        <Box style={{ flex: 1 }} />

        <Tooltip label="Cài đặt" position="right" withArrow>
          <ActionIcon
            size="lg"
            variant="subtle"
            color="gray"
            onClick={() => setShowSettings(true)}
          >
            <IconSettings size={20} />
          </ActionIcon>
        </Tooltip>
      </Box>

      <main className="main">
        {/* Keep editor mounted to preserve canvas state when switching tabs. */}
        <div
          style={{
            display: tab === "design" ? "flex" : "none",
            flex: 1,
            minHeight: 0,
          }}
        >
          <DesignWorkspace />
        </div>
        {tab === "produce" && <ProduceTab />}
      </main>

      <SettingsModal opened={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
