import { Group, Text, ThemeIcon } from "@mantine/core";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";

type StepState = "done" | "warn" | "pending";

function Step({
  label,
  state,
  detail,
}: {
  label: string;
  state: StepState;
  detail?: string;
}) {
  const color =
    state === "done" ? "teal" : state === "warn" ? "orange" : "gray";
  return (
    <Group gap={6} wrap="nowrap" className="produce-step">
      <ThemeIcon
        size="sm"
        radius="xl"
        variant={state === "pending" ? "default" : "light"}
        color={color}
      >
        {state === "pending" ? (
          <Text span size="xs" fw={700}>
            ·
          </Text>
        ) : state === "warn" ? (
          <IconAlertTriangle size={12} />
        ) : (
          <IconCheck size={12} />
        )}
      </ThemeIcon>
      <Text size="xs" c={state === "pending" ? "dimmed" : undefined}>
        {label}
        {detail ? (
          <Text span c="dimmed">
            {" "}
            · {detail}
          </Text>
        ) : null}
      </Text>
    </Group>
  );
}

export function ProduceStatusBar({
  hasSheet,
  boundCount,
  totalBindable,
  notEnough,
  notSynced,
  rowsNeeded,
  candidateCount,
  hasRendered,
  dataStale,
}: {
  hasSheet: boolean;
  boundCount: number;
  totalBindable: number;
  notEnough: boolean;
  notSynced?: boolean;
  rowsNeeded: number;
  candidateCount: number;
  hasRendered: boolean;
  dataStale: boolean;
}) {
  const bindDone = totalBindable > 0 && boundCount >= totalBindable;
  const rowsOk = !notEnough && !notSynced && rowsNeeded > 0;

  return (
    <Group className="produce-status" gap="lg" wrap="wrap">
      {dataStale && (
        <Text size="xs" c="orange.7">
          Dữ liệu có thể chưa mới — vào tab Dữ liệu để cập nhật.
        </Text>
      )}
      <Step
        label="Bảng dữ liệu"
        state={hasSheet ? "done" : "warn"}
        detail={hasSheet ? undefined : "chưa chọn"}
      />
      <Step
        label="Gán trang"
        state={
          totalBindable === 0
            ? "pending"
            : bindDone
              ? "done"
              : boundCount > 0
                ? "warn"
                : "warn"
        }
        detail={
          totalBindable > 0 ? `${boundCount}/${totalBindable}` : undefined
        }
      />
      <Step
        label="Đủ dòng"
        state={
          !hasSheet
            ? "pending"
            : notSynced
              ? "warn"
              : rowsOk
                ? "done"
                : notEnough
                  ? "warn"
                  : "pending"
        }
        detail={
          notSynced
            ? "chưa đồng bộ dữ liệu"
            : rowsNeeded > 0
              ? `cần ${rowsNeeded}, có ${candidateCount}`
              : undefined
        }
      />
      <Step
        label="Sinh & xuất"
        state={hasRendered ? "done" : "pending"}
        detail={hasRendered ? "đã sinh ảnh" : undefined}
      />
    </Group>
  );
}
