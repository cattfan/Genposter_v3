import { useMemo, useState } from "react";
import {
  Badge,
  Combobox,
  Group,
  InputBase,
  Text,
  Tooltip,
  useCombobox,
} from "@mantine/core";

import {
  availableFamilies,
  getFontPreviewStyle,
  type FontFamilyOption,
} from "../../lib/fonts.js";
import type { EditorApi } from "./useEditor.js";

function TierBadge({ tier }: { tier: FontFamilyOption["tier"] }) {
  const badge = (
    <Badge size="xs" variant="light" color={tier === "C" ? "orange" : "gray"}>
      {tier}
    </Badge>
  );
  if (tier === "C") {
    return (
      <Tooltip label="Nên dùng cho cụm ngắn" withArrow>
        <span>{badge}</span>
      </Tooltip>
    );
  }
  return badge;
}

export function FontFamilyCombobox({
  value,
  ed,
  onChange,
  compact,
}: {
  value: string;
  ed: EditorApi;
  onChange: (fontFamily: string) => void;
  compact?: boolean;
}) {
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch("");
    },
  });
  const [search, setSearch] = useState("");
  const families = availableFamilies();
  const q = search.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      q
        ? families.filter(
            (f) =>
              f.label.toLowerCase().includes(q) ||
              f.group.toLowerCase().includes(q),
          )
        : families,
    [families, q],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, FontFamilyOption[]>();
    for (const f of filtered) {
      const items = map.get(f.group) ?? [];
      items.push(f);
      map.set(f.group, items);
    }
    return map;
  }, [filtered]);

  return (
    <Combobox
      store={combobox}
      withinPortal
      onOptionSubmit={async (v) => {
        onChange(v);
        try {
          await document.fonts.load(`16px "${v}"`);
        } catch {
          /* ignore */
        }
        ed.getCanvas()?.requestRenderAll();
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          label={compact ? undefined : "Font"}
          component="button"
          type="button"
          pointer
          size={compact ? "xs" : "sm"}
          w={compact ? 160 : undefined}
          rightSection={<Combobox.Chevron />}
          onClick={() => combobox.toggleDropdown()}
          rightSectionPointerEvents="none"
        >
          <Text style={getFontPreviewStyle(value)} size="sm" truncate>
            {value}
          </Text>
        </InputBase>
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Search
          placeholder="Tìm font…"
          value={search}
          onChange={(e) => {
            combobox.updateSelectedOptionIndex();
            setSearch(e.currentTarget.value);
          }}
        />
        <Combobox.Options mah={280} style={{ overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <Combobox.Empty>Không tìm thấy font</Combobox.Empty>
          ) : (
            Array.from(grouped.entries()).map(([group, items]) => (
              <Combobox.Group label={group} key={group}>
                {items.map((f) => (
                  <Combobox.Option value={f.value} key={f.value}>
                    <Group justify="space-between" wrap="nowrap" gap="xs">
                      <Text style={getFontPreviewStyle(f.value)} size="sm" truncate>
                        {f.label}
                      </Text>
                      <TierBadge tier={f.tier} />
                    </Group>
                  </Combobox.Option>
                ))}
              </Combobox.Group>
            ))
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
