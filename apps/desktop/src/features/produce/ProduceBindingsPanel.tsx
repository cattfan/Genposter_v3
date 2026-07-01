import type { DataGroupDef } from "@genposter/schema";
import {
  Accordion,
  ActionIcon,
  Group,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconClipboard, IconCopy } from "@tabler/icons-react";

import {
  copyBinding,
  copyGroupBindings,
  hasBindingClipboard,
  hasGroupBindingClipboard,
  pasteBinding,
  pasteGroupBindings,
  getGroupClipboardSourceIds,
} from "./bindingClipboard.js";
import type { ElementInfo } from "./elements.js";
import { bindKind, buildBindOptions } from "./options.js";
import type { Draft } from "./preset-utils.js";

function BindingRow({
  el,
  bind,
  canonFields,
  onBind,
  onCopy,
  onPaste,
}: {
  el: ElementInfo;
  bind: string;
  canonFields: string[];
  onBind: (bind: string) => void;
  onCopy: () => void;
  onPaste: () => void;
}) {
  const kind = bindKind(bind);
  const selectVal = kind === "static" ? "static:" : kind === "ai" ? "ai:" : bind;
  const options = buildBindOptions(canonFields, el.isImage);

  return (
    <Table.Tr key={el.id}>
      <Table.Td>
        <Text size="sm" fw={600} truncate>
          {el.label}
        </Text>
        <Text size="xs" c="dimmed" truncate>
          {el.type} · {el.id}
        </Text>
      </Table.Td>
      <Table.Td>
        <Select
          size="xs"
          allowDeselect={false}
          comboboxProps={{ withinPortal: true }}
          value={selectVal}
          data={options}
          onChange={(v) => onBind(v ?? "")}
        />
      </Table.Td>
      <Table.Td>
        {kind !== "plain" ? (
          <TextInput
            size="xs"
            value={bind.slice(kind === "static" ? 7 : 3)}
            placeholder={kind === "ai" ? "Prompt…" : "Văn bản…"}
            onChange={(e) =>
              onBind((kind === "static" ? "static:" : "ai:") + e.currentTarget.value)
            }
          />
        ) : (
          <Text c="dimmed" size="xs">
            —
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Group gap={4} wrap="nowrap">
          <Tooltip label="Sao chép binding" withArrow>
            <ActionIcon variant="subtle" size="sm" onClick={onCopy}>
              <IconCopy size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Dán binding" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              disabled={!hasBindingClipboard()}
              onClick={onPaste}
            >
              <IconClipboard size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

export function ProduceBindingsPanel({
  draft,
  setD,
  elements,
  dataGroups,
  canonFields,
}: {
  draft: Draft;
  setD: (patch: Partial<Draft>) => void;
  elements: ElementInfo[];
  dataGroups: DataGroupDef[];
  canonFields: string[];
}) {
  const solo = elements.filter((e) => !e.dataGroupId);
  const byId = new Map(elements.map((e) => [e.id, e]));

  const setBind = (id: string, bind: string) =>
    setD({ bindings: { ...draft.bindings, [id]: bind } });

  const bindingTable = (rows: ElementInfo[]) => (
    <Table striped highlightOnHover verticalSpacing="xs" layout="fixed">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w="26%">Đối tượng</Table.Th>
          <Table.Th w="30%">Nguồn dữ liệu</Table.Th>
          <Table.Th w="30%">Giá trị / prompt</Table.Th>
          <Table.Th w="14%">Copy</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((el) => (
          <BindingRow
            key={el.id}
            el={el}
            bind={draft.bindings[el.id] ?? ""}
            canonFields={canonFields}
            onBind={(b) => setBind(el.id, b)}
            onCopy={() => copyBinding(draft.bindings[el.id] ?? "")}
            onPaste={() => {
              const b = pasteBinding();
              if (b !== null) setBind(el.id, b);
            }}
          />
        ))}
      </Table.Tbody>
    </Table>
  );

  return (
    <Stack gap="md">
      {dataGroups.length > 0 && (
        <>
          <Text size="sm" fw={600}>
            Nhóm dữ liệu
          </Text>
          <Accordion variant="separated" radius="md">
            {dataGroups.map((g) => {
              const members = g.memberIds
                .map((id) => byId.get(id))
                .filter((e): e is ElementInfo => Boolean(e));
              const sourceMembers = getGroupClipboardSourceIds()
                .map((id) => byId.get(id))
                .filter((e): e is ElementInfo => Boolean(e));
              return (
                <Accordion.Item key={g.id} value={g.id}>
                  <Accordion.Control>
                    <Group justify="space-between" wrap="nowrap" pr="xs">
                      <Text fw={600} size="sm">
                        {g.label}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {g.mode === "slot"
                          ? `Item #${(g.itemIndex ?? 0) + 1}`
                          : "Lặp danh sách"}
                      </Text>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="sm">
                      <Group gap="xs">
                        <Tooltip label="Sao chép binding nhóm" withArrow>
                          <ActionIcon
                            variant="light"
                            onClick={() =>
                              copyGroupBindings(g.memberIds, draft.bindings)
                            }
                          >
                            <IconCopy size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Dán binding nhóm" withArrow>
                          <ActionIcon
                            variant="light"
                            disabled={!hasGroupBindingClipboard()}
                            onClick={() => {
                              const next = pasteGroupBindings(
                                sourceMembers.length ? sourceMembers : members,
                                members,
                                draft.bindings,
                              );
                              setD({ bindings: next });
                            }}
                          >
                            <IconClipboard size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Text size="xs" c="dimmed">
                          Nhóm slot lấy 1 dòng ngẫu nhiên; nhóm lặp lấy nhiều dòng.
                        </Text>
                      </Group>
                      {bindingTable(members)}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </>
      )}

      <Text size="sm" fw={600}>
        Đối tượng lẻ
      </Text>
      {solo.length === 0 ? (
        <Text c="dimmed" size="sm">
          Không có đối tượng lẻ.
        </Text>
      ) : (
        bindingTable(solo)
      )}
    </Stack>
  );
}
