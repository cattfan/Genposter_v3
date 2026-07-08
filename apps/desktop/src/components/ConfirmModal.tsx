import { Button, Group, Modal, Stack, Text } from "@mantine/core";

/** Shared confirmation dialog for destructive actions (replaces window.confirm). */
export function ConfirmModal({
  opened,
  title,
  message,
  confirmLabel = "Xoá",
  onConfirm,
  onClose,
}: {
  opened: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered size="sm">
      <Stack>
        <Text size="sm">{message}</Text>
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>
            Hủy
          </Button>
          <Button
            color="red"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
