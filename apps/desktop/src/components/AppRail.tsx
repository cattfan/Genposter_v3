import { Box, Stack, Text, ThemeIcon, Tooltip, UnstyledButton } from "@mantine/core";
import type { IconProps } from "@tabler/icons-react";

import { AppLogo } from "./AppLogo.js";

export interface RailTab {
  id: string;
  label: string;
  Icon: React.ComponentType<IconProps>;
}

export function AppRail({
  tabs,
  active,
  onChange,
}: {
  tabs: RailTab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <Box component="aside" className="rail">
      <Box className="rail-brand">
        <AppLogo variant="rail" />
      </Box>

      <Stack gap={4} w="100%" align="center" className="rail-nav">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <Tooltip key={id} label={label} position="right" withArrow offset={8}>
              <UnstyledButton
                className="rail-btn"
                data-active={isActive || undefined}
                onClick={() => onChange(id)}
              >
                <ThemeIcon
                  size={36}
                  radius="md"
                  variant={isActive ? "filled" : "light"}
                  color={isActive ? "riviu" : "gray"}
                >
                  <Icon size={19} stroke={1.75} />
                </ThemeIcon>
                <Text fz={10} fw={600} mt={4} c={isActive ? "riviu.7" : "dimmed"}>
                  {label}
                </Text>
              </UnstyledButton>
            </Tooltip>
          );
        })}
      </Stack>
    </Box>
  );
}
