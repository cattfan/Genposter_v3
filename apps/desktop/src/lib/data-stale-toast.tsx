import { Button, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";

export const DATA_STALE_TOAST_ID = "genposter-data-stale";

export function showDataStaleToast(opts: { actionLabel: string; onAction: () => void }) {
  notifications.show({
    id: DATA_STALE_TOAST_ID,
    message: (
      <Group gap={10} wrap="nowrap" align="center" className="data-stale-toast__row">
        <Text size="sm" fw={500} className="data-stale-toast__text">
          Dữ liệu mới trên server
        </Text>
        <Button
          size="compact-xs"
          variant="filled"
          color="riviu"
          className="data-stale-toast__btn"
          onClick={opts.onAction}
        >
          {opts.actionLabel}
        </Button>
      </Group>
    ),
    autoClose: false,
    withCloseButton: true,
    position: "bottom-right",
    classNames: {
      root: "data-stale-toast",
      body: "data-stale-toast__body",
      description: "data-stale-toast__desc",
      closeButton: "data-stale-toast__close",
    },
  });
}

export function hideDataStaleToast() {
  notifications.hide(DATA_STALE_TOAST_ID);
}
