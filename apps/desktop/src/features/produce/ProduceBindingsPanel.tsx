import { useEffect, useRef } from "react";
import type { DataGroupDef } from "@genposter/schema";
import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconClipboard,
  IconCopy,
  IconPhoto,
  IconSquare,
  IconTypography,
} from "@tabler/icons-react";

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

function elementIcon(el: ElementInfo) {
  if (el.isImage) return IconPhoto;
  const t = el.type.toLowerCase();
  if (t.includes("text")) return IconTypography;
  return IconSquare;
}

function BindingCard({
  el,
  bind,
  canonFields,
  onBind,
  onCopy,
  onPaste,
  highlight,
  isActive,
  onHover,
  onActivate,
}: {
  el: ElementInfo;
  bind: string;
  canonFields: string[];
  onBind: (bind: string) => void;
  onCopy: () => void;
  onPaste: () => void;
  highlight: "hover" | "active" | null;
  isActive: boolean;
  onHover: (id: string | null) => void;
  onActivate: (id: string) => void;
}) {
  const selectRef = useRef<HTMLInputElement>(null);
  const kind = bindKind(bind);
  const selectVal = kind === "static" ? "static:" : kind === "ai" ? "ai:" : bind;
  const options = buildBindOptions(canonFields, el.isImage);
  const Icon = elementIcon(el);
  const unbound = !bind;

  useEffect(() => {
    if (!isActive) return;
    selectRef.current?.focus();
  }, [isActive]);

  return (
    <Box
      className={`binding-card${unbound ? " binding-card--unbound" : ""}${highlight ? ` binding-card--${highlight}` : ""}`}
      data-el-row={el.id}
      onMouseEnter={() => onHover(el.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onActivate(el.id)}
    >
      <Group justify="space-between" wrap="nowrap" mb={8}>
        <Group gap={8} wrap="nowrap" miw={0}>
          <ThemeIcon size="md" variant="light" color={el.isImage ? "blue" : "gray"} radius="md">
            <Icon size={16} stroke={1.5} />
          </ThemeIcon>
          <Stack gap={0} miw={0}>
            <Group gap={6} wrap="nowrap">
              <Text size="sm" fw={600} truncate>
                {el.label}
              </Text>
              {unbound && (
                <Badge size="xs" variant="light" color="orange">
                  Chưa gán
                </Badge>
              )}
            </Group>
            <Text size="xs" c="dimmed" truncate>
              {el.isImage ? "Ảnh" : "Văn bản / khác"}
            </Text>
          </Stack>
        </Group>
        <Group gap={2} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
          <Tooltip label="Sao chép gán" withArrow>
            <ActionIcon variant="subtle" size="sm" onClick={onCopy}>
              <IconCopy size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Dán gán" withArrow>
            <ActionIcon variant="subtle" size="sm" disabled={!hasBindingClipboard()} onClick={onPaste}>
              <IconClipboard size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
      <Stack gap={6} onClick={(e) => e.stopPropagation()}>
        <Select
          ref={selectRef}
          size="xs"
          label="Nguồn dữ liệu"
          allowDeselect={false}
          comboboxProps={{ withinPortal: true }}
          value={selectVal}
          data={options}
          onChange={(v) => onBind(v ?? "")}
        />
        {kind !== "plain" && (
          <TextInput
            size="xs"
            label={kind === "ai" ? "Prompt AI" : "Văn bản cố định"}
            value={bind.slice(kind === "static" ? 7 : 3)}
            placeholder={kind === "ai" ? "Mô tả caption…" : "Nhập nội dung…"}
            error={
              (kind === "static" && bind.length <= 7) || (kind === "ai" && bind.length <= 3)
                ? "Bắt buộc nhập nội dung"
                : undefined
            }
            onChange={(e) =>
              onBind((kind === "static" ? "static:" : "ai:") + e.currentTarget.value)
            }
          />
        )}
      </Stack>
    </Box>
  );
}

export function ProduceBindingsPanel({
  draft,
  setD,
  elements,
  dataGroups,
  canonFields,
  hoverId = null,
  activeId = null,
  onHover = () => {},
  onActivate = () => {},
  onHoverGroup = () => {},
  groupColors = {},
}: {
  draft: Draft;
  setD: (patch: Partial<Draft>) => void;
  elements: ElementInfo[];
  dataGroups: DataGroupDef[];
  canonFields: string[];
  hoverId?: string | null;
  activeId?: string | null;
  onHover?: (id: string | null) => void;
  onActivate?: (id: string) => void;
  onHoverGroup?: (id: string | null) => void;
  groupColors?: Record<string, string>;
}) {
  const solo = elements.filter((e) => !e.dataGroupId);
  const byId = new Map(elements.map((e) => [e.id, e]));

  const setBind = (id: string, bind: string) =>
    setD({ bindings: { ...draft.bindings, [id]: bind } });

  const bindingList = (rows: ElementInfo[]) => (
    <Stack gap="xs">
      {rows.map((el) => (
        <BindingCard
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
          highlight={activeId === el.id ? "active" : hoverId === el.id ? "hover" : null}
          isActive={activeId === el.id}
          onHover={onHover}
          onActivate={onActivate}
        />
      ))}
    </Stack>
  );

  return (
    <Stack gap="md">
      {dataGroups.length > 0 && (
        <>
          <Text size="sm" fw={600}>
            Nhóm dữ liệu
          </Text>
          <Accordion
            variant="separated"
            radius="md"
            multiple
            defaultValue={dataGroups.map((g) => g.id)}
          >
            {dataGroups.map((g) => {
              const members = g.memberIds
                .map((id) => byId.get(id))
                .filter((e): e is ElementInfo => Boolean(e));
              const sourceMembers = getGroupClipboardSourceIds()
                .map((id) => byId.get(id))
                .filter((e): e is ElementInfo => Boolean(e));
              return (
                <Accordion.Item key={g.id} value={g.id}>
                  <Accordion.Control
                    onMouseEnter={() => onHoverGroup(g.id)}
                    onMouseLeave={() => onHoverGroup(null)}
                  >
                    <Group justify="space-between" wrap="nowrap" pr="xs">
                      <Group gap={8} wrap="nowrap">
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            flex: "0 0 auto",
                            background: groupColors[g.id] ?? "var(--mantine-color-gray-4)",
                          }}
                        />
                        <Text fw={600} size="sm">
                          {g.label}
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {g.mode === "slot" ? "1 dòng/bộ" : "Lặp danh sách"}
                      </Text>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="sm">
                      <Group gap="xs" wrap="nowrap">
                        <Tooltip label="Sao chép gán nhóm" withArrow>
                          <ActionIcon
                            variant="light"
                            onClick={() =>
                              copyGroupBindings(g.memberIds, draft.bindings)
                            }
                          >
                            <IconCopy size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Dán gán nhóm" withArrow>
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
                      </Group>
                      {bindingList(members)}
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
        bindingList(solo)
      )}
    </Stack>
  );
}
