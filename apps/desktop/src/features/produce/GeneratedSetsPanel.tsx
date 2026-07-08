import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Slider,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconMinus, IconPlus } from "@tabler/icons-react";

import type { RenderedSet } from "../../lib/render.js";

/**
 * Docked preview panel after "Sinh ảnh" — sits below the editor workspace.
 * Captions are only generated on export.
 */
export function GeneratedSetsPanel({
  rendered,
  selected,
  allSelected,
  collapsed,
  zoom,
  onToggleCollapse,
  onZoomChange,
  onToggle,
  onToggleAll,
}: {
  rendered: RenderedSet[];
  selected: Set<number>;
  allSelected: boolean;
  collapsed: boolean;
  zoom: number;
  onToggleCollapse: () => void;
  onZoomChange: (zoom: number) => void;
  onToggle: (setIndex: number) => void;
  onToggleAll: () => void;
}) {
  const selectedCount = selected.size;

  return (
    <div
      className={`produce-output-dock${collapsed ? " produce-output-dock--collapsed" : ""}`}
      style={{ ["--genset-img-height" as string]: `${Math.round(120 * (zoom / 100))}px` }}
    >
      <Group className="produce-output-dock-head" justify="space-between" wrap="nowrap" gap="sm">
        <Group gap="sm" wrap="nowrap">
          <Text size="sm" fw={600}>
            Kết quả sinh ảnh
          </Text>
          <Text size="xs" c="dimmed">
            {selectedCount}/{rendered.length} bộ chọn xuất
          </Text>
        </Group>
        <Group gap="xs" wrap="nowrap">
          {!collapsed && (
            <>
              <Group gap={6} wrap="nowrap" className="khuon-generated-zoom-row">
                <Tooltip label="Thu nhỏ ảnh" withArrow>
                  <ActionIcon
                    variant="default"
                    size="sm"
                    onClick={() => onZoomChange(Math.max(50, zoom - 10))}
                    aria-label="Thu nhỏ"
                  >
                    <IconMinus size={14} />
                  </ActionIcon>
                </Tooltip>
                <Slider
                  className="khuon-generated-zoom"
                  size="xs"
                  min={50}
                  max={150}
                  step={10}
                  value={zoom}
                  onChange={onZoomChange}
                  label={(v) => `${v}%`}
                  style={{ flex: 1, minWidth: 80, maxWidth: 160 }}
                />
                <Tooltip label="Phóng to ảnh" withArrow>
                  <ActionIcon
                    variant="default"
                    size="sm"
                    onClick={() => onZoomChange(Math.min(150, zoom + 10))}
                    aria-label="Phóng to"
                  >
                    <IconPlus size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <Button size="compact-xs" variant="default" onClick={onToggleAll}>
                {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </Button>
            </>
          )}
          <Tooltip label={collapsed ? "Mở rộng xem trước" : "Thu gọn panel"} withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Mở rộng" : "Thu gọn"}
            >
              {collapsed ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
      {!collapsed && (
        <div className="khuon-generated-list">
          {rendered.map((s) => {
            const on = selected.has(s.setIndex);
            return (
              <Card
                key={s.setIndex}
                withBorder
                radius="md"
                padding="xs"
                className={`khuon-genset${on ? "" : " set-card-off"}`}
              >
                <Group gap="sm" wrap="nowrap" mb={6} justify="space-between">
                  <Checkbox
                    size="xs"
                    checked={on}
                    onChange={() => onToggle(s.setIndex)}
                    label={
                      <Text size="sm" fw={600} span>
                        Bộ {s.setIndex}
                      </Text>
                    }
                  />
                  {!on && (
                    <Badge size="xs" variant="light" color="gray">
                      Loại khỏi xuất
                    </Badge>
                  )}
                </Group>
                <div className="khuon-genset-pages">
                  {s.pages.map((p, i) => (
                    <img key={i} src={p.previewUrl} alt="" className="khuon-genset-img" />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
