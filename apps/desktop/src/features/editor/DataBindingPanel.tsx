import {
  Badge,
  Button,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";

import { getStr, isTextType } from "../../lib/fabric-util.js";
import { getObjectGroupId } from "./dataGroups.js";
import { DESIGN_SLOTS } from "./palette.js";
import type { EditorApi } from "./useEditor.js";

export function DataBindingPanel({ ed }: { ed: EditorApi }) {
  const obj = ed.getActive();
  if (!obj) {
    return (
      <Text c="dimmed" size="xs">
        Chọn một đối tượng để gán trường dữ liệu.
      </Text>
    );
  }
  const curBind = getStr(obj, "gpBind") ?? "";
  const curLabel = getStr(obj, "gpLabel") ?? "";
  const groupId = getObjectGroupId(obj);
  const group = groupId ? ed.getDataGroups().find((g) => g.id === groupId) : undefined;
  const text = isTextType(obj);

  return (
    <Stack gap="sm">
      <Badge color={curBind ? "riviu" : "gray"} variant="light" size="lg">
        {curBind ? curLabel || curBind : "Chưa gán"}
      </Badge>
      {group && (
        <Badge color="blue" variant="light" size="sm">
          Nhóm: {group.label}
        </Badge>
      )}
      <SimpleGrid cols={2} spacing="xs">
        {DESIGN_SLOTS.filter((s) =>
          text ? s.kind === "text" : s.kind === "photo",
        ).map((s) => (
          <Button
            key={s.bind}
            variant="default"
            size="xs"
            onClick={() => {
              if (text) ed.updateActive({ text: `[${s.label}]` });
              ed.setGpBind(obj, s.bind, s.label);
            }}
          >
            {s.label}
          </Button>
        ))}
      </SimpleGrid>
      <Button
        variant="subtle"
        color="gray"
        size="xs"
        onClick={() => ed.setGpBind(obj, "", "")}
      >
        Bỏ gán
      </Button>
      {group && (
        <Button
          variant="light"
          size="xs"
          color="gray"
          onClick={() => ed.removeFromDataGroup(obj)}
        >
          Tách khỏi nhóm «{group.label}»
        </Button>
      )}
      {!group && ed.getDataGroups().length > 0 && (
        <Stack gap={4}>
          <Text size="xs" fw={600} c="dimmed">
            Thêm vào nhóm
          </Text>
          {ed.getDataGroups().map((g) => (
            <Button
              key={g.id}
              variant="default"
              size="xs"
              onClick={() => ed.addToDataGroup(g.id, [obj])}
            >
              {g.label}
            </Button>
          ))}
        </Stack>
      )}
      <Text c="dimmed" size="xs">
        Gán slot gợi ý cho từng phần tử. Ở tab Tạo ảnh, object trong cùng nhóm dữ liệu
        sẽ nhận thông tin của một quán/item.
      </Text>
    </Stack>
  );
}
