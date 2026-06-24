import { ActionIcon, Tooltip } from "@mantine/core";
import { IconLayout2 } from "@tabler/icons-react";

export function RightRail({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <aside className="panel right-rail">
      <Tooltip label="Inspector" position="left">
        <ActionIcon
          variant={active ? "filled" : "default"}
          color={active ? "riviu" : "gray"}
          size="lg"
          onClick={onToggle}
        >
          <IconLayout2 size={20} />
        </ActionIcon>
      </Tooltip>
    </aside>
  );
}
