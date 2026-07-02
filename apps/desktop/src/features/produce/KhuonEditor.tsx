import { useEffect, useMemo, useState } from "react";
import {
  Anchor,
  Box,
  Card,
  Collapse,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";

import { aiConfigured } from "../../lib/ai.js";

import type { SheetInfo } from "../../lib/excel.js";
import type { PageElements } from "./elements.js";
import type { PagePreviewData } from "./page-preview.js";
import { groupColorMap, PagePreview } from "./PagePreview.js";
import { ProduceBindingsPanel } from "./ProduceBindingsPanel.js";
import type { Draft } from "./preset-utils.js";

/**
 * Khuôn configuration workspace: data source + output on the left, the page
 * preview front and center with a page strip, bindings for the current page
 * on the right.
 */
export function KhuonEditor({
  draft,
  setD,
  pages,
  previews,
  sheets,
  columns,
  canonFields,
  boundIds,
  rowsNeededPerSet,
  candidateCount,
  notEnough,
  onChooseSheet,
}: {
  draft: Draft;
  setD: (patch: Partial<Draft>) => void;
  pages: PageElements[];
  previews: PagePreviewData[];
  sheets: SheetInfo[];
  columns: string[];
  canonFields: string[];
  boundIds: Set<string>;
  rowsNeededPerSet: number;
  candidateCount: number;
  notEnough: boolean;
  onChooseSheet: (sheet: string) => void;
}) {
  const [pageIdx, setPageIdx] = useState(0);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoverGroupId, setHoverGroupId] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);

  useEffect(() => {
    if (pageIdx >= pages.length) setPageIdx(0);
  }, [pages.length, pageIdx]);

  // Clicking an element on the preview scrolls its row into view.
  useEffect(() => {
    if (!activeId) return;
    document
      .querySelector(`[data-el-row="${CSS.escape(activeId)}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId]);

  const page = pages[pageIdx];
  const preview = previews.find((pv) => pv.pageId === page?.pageId);

  const groupColors = useMemo(
    () => groupColorMap((page?.dataGroups ?? []).map((g) => g.id)),
    [page],
  );

  return (
    <div className="khuon-editor">
      <div className="khuon-col">
        <Card withBorder radius="lg" padding="md">
          <Title order={6} mb="sm">
            Nguồn dữ liệu
          </Title>
          <Stack gap="xs">
            <TextInput
              label="Tên khuôn"
              size="xs"
              value={draft.name}
              onChange={(e) => setD({ name: e.currentTarget.value })}
            />
            <Select
              label="Sheet"
              size="xs"
              placeholder="— Chọn sheet —"
              value={draft.sheet || null}
              data={sheets.map((s) => ({ value: s.sheet, label: `${s.label} (${s.rows})` }))}
              onChange={(v) => onChooseSheet(v ?? "")}
            />
            <Select
              label="Lọc theo cột"
              size="xs"
              placeholder="— Không lọc —"
              clearable
              value={draft.filterField || null}
              data={columns}
              onChange={(v) => setD({ filterField: v ?? "" })}
            />
            <TextInput
              label="Giá trị lọc"
              size="xs"
              placeholder="vd: An Toi"
              value={draft.filterValue}
              onChange={(e) => setD({ filterValue: e.currentTarget.value })}
            />
            <NumberInput
              label="Giới hạn dòng (trống = tất cả)"
              size="xs"
              min={0}
              value={draft.limit === "" ? "" : Number(draft.limit)}
              onChange={(v) => setD({ limit: v === "" || v == null ? "" : String(v) })}
            />
            <SimpleGrid cols={2} spacing="xs">
              <NumberInput
                label="Ảnh / mục"
                size="xs"
                min={0}
                value={draft.perItem}
                onChange={(v) => setD({ perItem: typeof v === "number" ? v : 0 })}
              />
              <NumberInput
                label="Ảnh / bộ"
                size="xs"
                min={0}
                value={draft.perSet}
                onChange={(v) => setD({ perSet: typeof v === "number" ? v : 0 })}
              />
            </SimpleGrid>
          </Stack>
        </Card>

        <Card withBorder radius="lg" padding="md">
          <Title order={6} mb="sm">
            Số lượng & Xuất
          </Title>
          <Stack gap="xs">
            <NumberInput
              label="Số bộ muốn sinh"
              size="xs"
              min={1}
              value={draft.randomSetCount}
              onChange={(v) => setD({ randomSetCount: typeof v === "number" ? v : 1 })}
            />
            <Text size="xs" c={notEnough ? "red" : "dimmed"}>
              Mỗi bộ cần {rowsNeededPerSet} dòng dữ liệu · có {candidateCount} dòng sau lọc
              {notEnough ? " — không đủ!" : ""}
            </Text>
            <SimpleGrid cols={2} spacing="xs">
              <Box>
                <Text size="xs" fw={500} mb={4}>
                  Định dạng
                </Text>
                <SegmentedControl
                  fullWidth
                  size="xs"
                  value={draft.format}
                  onChange={(v) => setD({ format: v as "jpg" | "png" })}
                  data={[
                    { value: "jpg", label: "JPG" },
                    { value: "png", label: "PNG" },
                  ]}
                />
              </Box>
              <NumberInput
                label="Chất lượng"
                size="xs"
                min={10}
                max={100}
                value={draft.quality}
                onChange={(v) => setD({ quality: typeof v === "number" ? v : 90 })}
              />
            </SimpleGrid>
          </Stack>
        </Card>

        <Card withBorder radius="lg" padding="md">
          <Group justify="space-between" wrap="nowrap">
            <Box>
              <Title order={6}>Caption AI</Title>
              <Text size="xs" c="dimmed">
                Thêm caption.txt vào mỗi bộ
              </Text>
            </Box>
            <Switch
              size="sm"
              checked={draft.captionEnabled}
              onChange={(e) => setD({ captionEnabled: e.currentTarget.checked })}
            />
          </Group>
          {draft.captionEnabled && (
            <Stack gap="xs" mt="sm">
              {!aiConfigured() && (
                <Text size="xs" c="orange.7">
                  Chưa cấu hình AI API — vào tab Cài đặt để nhập key, nếu không caption sẽ bị bỏ qua.
                </Text>
              )}
              <Anchor
                component="button"
                type="button"
                size="xs"
                c="dimmed"
                underline="never"
                onClick={() => setPromptOpen((o) => !o)}
              >
                <Group gap={4} wrap="nowrap">
                  {promptOpen ? (
                    <IconChevronDown size={13} />
                  ) : (
                    <IconChevronRight size={13} />
                  )}
                  <span>{promptOpen ? "Thu gọn prompt" : "Chỉnh prompt"}</span>
                </Group>
              </Anchor>
              <Collapse in={promptOpen}>
                <Textarea
                  size="xs"
                  autosize
                  minRows={5}
                  maxRows={12}
                  value={draft.captionPrompt}
                  onChange={(e) => setD({ captionPrompt: e.currentTarget.value })}
                />
              </Collapse>
            </Stack>
          )}
        </Card>
      </div>

      <div className="khuon-center">
        <div className="khuon-preview-area">
          {preview && preview.img ? (
            <PagePreview
              data={preview}
              bound={boundIds}
              hoverId={hoverId}
              activeId={activeId}
              hoverGroupId={hoverGroupId}
              groupColors={groupColors}
              onHover={setHoverId}
              onSelect={setActiveId}
            />
          ) : (
            <Text c="dimmed" size="sm">
              {pages.length === 0
                ? "Chọn một bộ mẫu để xem trước các trang."
                : "Đang dựng xem trước…"}
            </Text>
          )}
        </div>
        {previews.length > 1 && (
          <div className="khuon-pagestrip">
            {previews.map((pv, i) => (
              <UnstyledButton
                key={pv.pageId}
                className={`khuon-page-thumb${i === pageIdx ? " active" : ""}`}
                onClick={() => setPageIdx(i)}
              >
                {pv.img ? (
                  <img src={pv.img} alt="" draggable={false} />
                ) : (
                  <Box w={48} h={64} bg="gray.1" />
                )}
              </UnstyledButton>
            ))}
          </div>
        )}
      </div>

      <div className="khuon-col">
        <Card withBorder radius="lg" padding="md">
          <Title order={6} mb="sm">
            Gán dữ liệu — {page?.name ?? "…"}
          </Title>
          {!page || page.elements.length === 0 ? (
            <Text c="dimmed" size="sm">
              Trang này không có đối tượng gán được.
            </Text>
          ) : (
            <ProduceBindingsPanel
              draft={draft}
              setD={setD}
              elements={page.elements}
              dataGroups={page.dataGroups}
              canonFields={canonFields}
              hoverId={hoverId}
              activeId={activeId}
              onHover={setHoverId}
              onActivate={setActiveId}
              onHoverGroup={setHoverGroupId}
              groupColors={groupColors}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
