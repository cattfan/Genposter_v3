import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Anchor,
  Box,
  Card,
  Collapse,
  Group,
  Loader,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import type { TemplateSet } from "@genposter/schema";

import { aiConfigured } from "../../lib/ai.js";
import { renderProduceBoundPreview } from "../editor/dataPreview.js";

import type { SheetInfo } from "../../lib/excel.js";
import type { PageElements } from "./elements.js";
import type { PagePreviewData } from "./page-preview.js";
import { groupColorMap, PagePreview } from "./PagePreview.js";
import { ProduceBindingsPanel } from "./ProduceBindingsPanel.js";
import type { Draft } from "./preset-utils.js";

const PREVIEW_DEBOUNCE_MS = 300;

/**
 * Khuôn configuration workspace: data source + output on the left, the page
 * preview front and center with a page strip, bindings for the current page
 * on the right.
 */
export function KhuonEditor({
  draft,
  setD,
  templateSet,
  templateKey,
  pages,
  previews,
  sheets,
  columns,
  canonFields,
  boundIds,
  rowsNeededPerSet,
  candidateCount,
  notEnough,
  candidateNotSynced,
  onChooseSheet,
}: {
  draft: Draft;
  setD: (patch: Partial<Draft>) => void;
  templateSet: TemplateSet | null;
  /** Changes when switching khuôn or template — resets page index. */
  templateKey: string;
  pages: PageElements[];
  previews: PagePreviewData[];
  sheets: SheetInfo[];
  columns: string[];
  canonFields: string[];
  boundIds: Set<string>;
  rowsNeededPerSet: number;
  candidateCount: number;
  notEnough: boolean;
  /** Cache has never been synced — candidateCount is not a real "0 rows". */
  candidateNotSynced?: boolean;
  onChooseSheet: (sheet: string) => void;
}) {
  const [pageIdx, setPageIdx] = useState(0);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoverGroupId, setHoverGroupId] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [boundPreviewOn, setBoundPreviewOn] = useState(false);
  const [sampleRowIndex, setSampleRowIndex] = useState(0);
  const [boundUrl, setBoundUrl] = useState("");
  const [boundLoading, setBoundLoading] = useState(false);
  const [boundPreviewError, setBoundPreviewError] = useState(false);
  const previewTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setPageIdx(0);
    setActiveId(null);
    setHoverId(null);
  }, [templateKey]);

  useEffect(() => {
    if (pageIdx >= pages.length) setPageIdx(0);
  }, [pages.length, pageIdx]);

  useEffect(() => {
    if (!activeId) return;
    document
      .querySelector(`[data-el-row="${CSS.escape(activeId)}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId]);

  const page = pages[pageIdx];
  const preview = previews.find((pv) => pv.pageId === page?.pageId);

  const pageBindStatus = useMemo(
    () =>
      pages.map((p) => {
        const total = p.elements.length;
        const bound = p.elements.filter((e) => draft.bindings[e.id]).length;
        return { total, bound, missing: total - bound };
      }),
    [pages, draft.bindings],
  );

  const refreshBoundPreview = useCallback(async () => {
    if (!boundPreviewOn || !templateSet || !draft.sheet) {
      setBoundUrl("");
      setBoundPreviewError(false);
      return;
    }
    setBoundLoading(true);
    setBoundPreviewError(false);
    try {
      const url = await renderProduceBoundPreview(
        templateSet,
        pageIdx,
        draft,
        sampleRowIndex,
      );
      setBoundUrl(url);
      if (!url) setBoundPreviewError(true);
    } catch (e) {
      setBoundUrl("");
      setBoundPreviewError(true);
      notifications.show({
        color: "red",
        message: `Không render được preview: ${String(e)}`,
      });
    } finally {
      setBoundLoading(false);
    }
  }, [boundPreviewOn, templateSet, draft, pageIdx, sampleRowIndex]);

  useEffect(() => {
    if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
    previewTimerRef.current = window.setTimeout(() => {
      void refreshBoundPreview();
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
    };
  }, [refreshBoundPreview]);

  useEffect(() => {
    setSampleRowIndex(0);
  }, [draft.sheet, draft.filterField, draft.filterValue, draft.limit]);

  const displayPreview = useMemo(() => {
    if (!preview) return preview;
    if (boundPreviewOn && boundUrl) return { ...preview, img: boundUrl };
    return preview;
  }, [preview, boundPreviewOn, boundUrl]);

  const groupColors = useMemo(
    () => groupColorMap((page?.dataGroups ?? []).map((g) => g.id)),
    [page],
  );

  const previewModeLabel = boundPreviewOn
    ? "Preview mẫu (1 bộ)"
    : "Preview template gốc";

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
              label="Bảng dữ liệu"
              size="xs"
              placeholder="— Chọn bảng —"
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
              onChange={(v) => setD({ filterField: v ?? "", filterValue: v ? draft.filterValue : "" })}
            />
            <TextInput
              label="Giá trị lọc"
              size="xs"
              placeholder="vd: An Toi"
              value={draft.filterValue}
              disabled={!draft.filterField}
              onChange={(e) => setD({ filterValue: e.currentTarget.value })}
            />
            <NumberInput
              label="Giới hạn dòng (trống = tất cả)"
              size="xs"
              min={0}
              value={draft.limit === "" ? "" : Number(draft.limit)}
              onChange={(v) => setD({ limit: v === "" || v == null ? "" : String(v) })}
            />
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
            <Text size="xs" c={candidateNotSynced || notEnough ? "red" : "dimmed"}>
              {candidateNotSynced
                ? "Chưa đồng bộ dữ liệu từ server — vào tab Dữ liệu bấm Cập nhật ngay."
                : `Mỗi bộ cần ${rowsNeededPerSet} dòng dữ liệu · có ${candidateCount} dòng sau lọc${notEnough ? " — không đủ!" : ""}`}
            </Text>
            <Box>
              <Text size="xs" fw={500} mb={4}>
                Định dạng xuất
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
        <Group justify="space-between" mb="xs" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Switch
              size="sm"
              label="Xem với dữ liệu"
              checked={boundPreviewOn}
              onChange={(e) => setBoundPreviewOn(e.currentTarget.checked)}
              disabled={!draft.sheet || !templateSet}
            />
            <Text size="xs" c="dimmed">
              {previewModeLabel}
            </Text>
          </Group>
          {boundPreviewOn && candidateCount > 1 && (
            <Group gap={4} wrap="nowrap">
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => setSampleRowIndex((i) => Math.max(0, i - 1))}
              >
                <IconChevronLeft size={16} />
              </ActionIcon>
              <Text size="xs" c="dimmed">
                Bộ mẫu từ dòng {sampleRowIndex + 1}
              </Text>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() =>
                  setSampleRowIndex((i) =>
                    // The preview window never wraps (see pickSetRows), so
                    // stop where a full, non-repeating window still fits.
                    Math.min(Math.max(0, candidateCount - rowsNeededPerSet), i + 1),
                  )
                }
              >
                <IconChevronRight size={16} />
              </ActionIcon>
            </Group>
          )}
        </Group>
        {boundPreviewOn && !draft.sheet && (
          <Text size="xs" c="orange.7" mb="xs">
            Chọn bảng dữ liệu bên trái để xem preview có bind.
          </Text>
        )}
        <div className="khuon-preview-area">
          {boundLoading && (
            <div className="khuon-preview-loading">
              <Loader size="sm" />
            </div>
          )}
          {displayPreview && displayPreview.img ? (
            <PagePreview
              data={displayPreview}
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
              {boundPreviewError
                ? "Không render được preview — kiểm tra gán dữ liệu và bảng nguồn."
                : boundLoading
                  ? "Đang render preview…"
                  : pages.length === 0
                    ? "Chọn một bộ mẫu để xem trước các trang."
                    : boundPreviewOn && draft.sheet
                      ? "Đang dựng preview có dữ liệu…"
                      : "Đang dựng xem trước…"}
            </Text>
          )}
        </div>
        {previews.length > 1 && (
          <div className="khuon-pagestrip">
            {previews.map((pv, i) => {
              const st = pageBindStatus[i];
              const badgeClass =
                !st || st.total === 0
                  ? ""
                  : st.missing === 0
                    ? "khuon-page-badge khuon-page-badge--done"
                    : "khuon-page-badge khuon-page-badge--warn";
              const tip =
                st && st.total > 0
                  ? st.missing === 0
                    ? "Đã gán đủ"
                    : `${st.missing}/${st.total} đối tượng chưa gán`
                  : "Không có đối tượng gán được";
              return (
                <Tooltip key={pv.pageId} label={tip} withArrow>
                  <UnstyledButton
                    className={`khuon-page-thumb${i === pageIdx ? " active" : ""}`}
                    onClick={() => setPageIdx(i)}
                  >
                    {st && st.total > 0 ? <span className={badgeClass} aria-hidden /> : null}
                    {pv.img ? (
                      <img src={pv.img} alt="" draggable={false} />
                    ) : (
                      <Box w={48} h={64} bg="gray.1" />
                    )}
                  </UnstyledButton>
                </Tooltip>
              );
            })}
          </div>
        )}
      </div>

      <div className="khuon-col">
        <Card withBorder radius="lg" padding="md">
          <Title order={6} mb={4}>
            Gán dữ liệu
          </Title>
          <Text size="xs" c="dimmed" mb="sm">
            {page?.name ?? "…"} — chọn nguồn cho từng đối tượng trên preview
          </Text>
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
