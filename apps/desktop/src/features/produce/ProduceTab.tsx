import { useEffect, useMemo, useState } from "react";
import { open as openPath } from "@tauri-apps/plugin-shell";
import { save } from "@tauri-apps/plugin-dialog";
import {
  Accordion,
  Alert,
  Box,
  Button,
  Card,
  Group,
  NumberInput,
  Progress,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconDeviceFloppy,
  IconDownload,
  IconFilePlus,
  IconFolderOpen,
} from "@tabler/icons-react";
import type { TemplateSet } from "@genposter/schema";

import { buildGenerate, countCandidates } from "../../lib/generate.js";
import { sheetColumns, listSheets, type SheetInfo } from "../../lib/excel.js";
import { loadMapping } from "../../lib/mapping.js";
import { renderSetsToZip } from "../../lib/render.js";
import {
  listRecipes,
  loadRecipe,
  saveRecipe,
  type RecipeSummary,
} from "../../lib/recipe-io.js";
import {
  listTemplateSets,
  loadTemplateSet,
  type TemplateSetSummary,
} from "../../lib/templateset-io.js";
import { ensureDir, writeBytes } from "../../lib/fsx.js";
import { join, paths } from "../../lib/paths.js";
import { buildKhuonPlan } from "../../lib/khuon-plan.js";
import { timestampZipName } from "../../lib/zip.js";
import { allElements, extractSetPages, type PageElements } from "./elements.js";
import { ProduceBindingsPanel } from "./ProduceBindingsPanel.js";
import {
  draftToRecipe,
  emptyDraft,
  mergeElements,
  recipeToDraft,
  type Draft,
} from "./preset-utils.js";
import "./produce.css";

const ok = (message: string) => notifications.show({ message, color: "teal" });
const fail = (message: string) => notifications.show({ message, color: "red" });

export function ProduceTab() {
  const [sets, setSets] = useState<TemplateSetSummary[]>([]);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [canonFields, setCanonFields] = useState<string[]>([]);

  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [pages, setPages] = useState<PageElements[]>([]);
  const [templateSet, setTemplateSet] = useState<TemplateSet | null>(null);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ dest: string; summaries: string[] } | null>(null);
  const [candidateCount, setCandidateCount] = useState(0);
  const [dataErr, setDataErr] = useState<string | null>(null);

  const setD = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => {
    void (async () => {
      try {
        setSets(await listTemplateSets());
        setRecipes(await listRecipes());
      } catch (e) {
        fail(`Không đọc được mẫu/khuôn: ${String(e)}`);
      }
      try {
        setSheets(await listSheets());
        setDataErr(null);
      } catch (e) {
        setDataErr(
          `Không đọc được Excel. Hãy đặt file vào data/database/ và kiểm tra mapping.yaml. (${String(e)})`,
        );
      }
    })();
  }, []);

  const rowsNeededPerSet = useMemo(
    () => (templateSet ? buildKhuonPlan(templateSet).rowsNeededPerSet : 0),
    [templateSet],
  );

  // Count rows AFTER applying the sheet filter + limit, matching what the
  // generator actually uses, so the sufficiency warning/gate is accurate.
  useEffect(() => {
    let cancelled = false;
    const filter =
      draft.filterField && draft.filterValue
        ? { [draft.filterField]: draft.filterValue }
        : {};
    const limit = draft.limit ? Number(draft.limit) : null;
    void countCandidates(draft.sheet, filter, limit)
      .then((n) => {
        if (!cancelled) setCandidateCount(n);
      })
      .catch(() => {
        if (!cancelled) setCandidateCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.sheet, draft.filterField, draft.filterValue, draft.limit]);

  const notEnough = rowsNeededPerSet > 0 && candidateCount < rowsNeededPerSet;

  async function chooseSet(id: string, base?: Draft) {
    if (!id) {
      setTemplateSet(null);
      setPages([]);
      return;
    }
    try {
      const set = await loadTemplateSet(id);
      const pe = extractSetPages(set);
      setTemplateSet(set);
      setPages(pe);
      setDraft((d) => mergeElements({ ...(base ?? d), templateId: id }, allElements(pe)));
    } catch (e) {
      fail(`Lỗi tải mẫu: ${String(e)}`);
    }
  }

  async function chooseSheet(sheet: string) {
    setD({ sheet });
    if (!sheet) {
      setColumns([]);
      setCanonFields([]);
      return;
    }
    try {
      setColumns(await sheetColumns(sheet));
      const m = await loadMapping();
      setCanonFields(Object.keys(m.sheets[sheet]?.fields ?? {}));
    } catch (e) {
      fail(`Lỗi đọc cột sheet: ${String(e)}`);
    }
  }

  async function chooseRecipe(id: string) {
    if (!id) {
      setDraft(emptyDraft(draft.templateId));
      return;
    }
    try {
      const r = await loadRecipe(id);
      const d = recipeToDraft(r);
      await chooseSet(r.templateId, d);
      await chooseSheet(r.data.sheet);
      setDraft(d);
      ok(`Đã mở khuôn: ${r.name}`);
    } catch (e) {
      fail(`Lỗi mở khuôn: ${String(e)}`);
    }
  }

  async function savePreset() {
    try {
      const recipe = draftToRecipe(draft, allElements(pages));
      const id = await saveRecipe(recipe);
      setRecipes(await listRecipes());
      setD({ id });
      ok(`Đã lưu khuôn: ${id}`);
    } catch (e) {
      fail(`Lỗi lưu khuôn: ${String(e)}`);
    }
  }

  async function generateAndExport() {
    if (!templateSet) return;
    setBusy(true);
    setResult(null);
    setProgress({ done: 0, total: 0 });
    try {
      const recipe = draftToRecipe(draft, allElements(pages));
      const payload = await buildGenerate(templateSet, recipe);
      await ensureDir(paths.outputDir());
      const dest = await save({
        defaultPath: join(paths.outputDir(), timestampZipName()),
        filters: [{ name: "Zip", extensions: ["zip"] }],
      });
      if (!dest) {
        ok("Đã hủy lưu.");
        return;
      }
      const { zipBytes, fileCount } = await renderSetsToZip(templateSet, payload, recipe, {
        onProgress: (done, total) => setProgress({ done, total }),
      });
      await writeBytes(dest, zipBytes);
      const summaries = payload.sets.map((s) => {
        const names = [
          ...new Set(
            s.pages.flatMap((p) =>
              p.groups.flatMap((g) => g.rows.map((r) => String(r.name ?? ""))),
            ),
          ),
        ]
          .filter(Boolean)
          .slice(0, 3);
        return `Bộ ${s.setIndex}: ${names.join(", ") || "(ảnh tĩnh)"}`;
      });
      setResult({ dest, summaries });
      ok(`Đã xuất ${payload.sets.length} bộ (${fileCount} ảnh).`);
    } catch (e) {
      fail(`Lỗi sinh ảnh: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const percent = progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  return (
    <div className="produce">
      <Group className="produce-head" gap="md" align="flex-end" wrap="wrap">
        <Box mr="auto">
          <Title order={3}>Tạo ảnh</Title>
          <Text c="dimmed" size="sm">
            Chọn bộ khuôn, gán dữ liệu theo trang, sinh nhiều bộ ngẫu nhiên
          </Text>
        </Box>
        <Select
          label="Bộ mẫu"
          placeholder="— Chọn bộ —"
          w={210}
          clearable
          value={draft.templateId || null}
          data={sets.map((t) => ({ value: t.id, label: t.name }))}
          onChange={(v) => void chooseSet(v ?? "")}
        />
        <Select
          label="Khuôn"
          placeholder="— Khuôn mới —"
          w={210}
          clearable
          value={draft.id || null}
          data={recipes.map((r) => ({ value: r.id, label: r.name }))}
          onChange={(v) => void chooseRecipe(v ?? "")}
        />
        <Button
          variant="default"
          leftSection={<IconFilePlus size={18} />}
          onClick={() => setDraft(emptyDraft(draft.templateId))}
        >
          Khuôn mới
        </Button>
        <Button leftSection={<IconDeviceFloppy size={18} />} onClick={() => void savePreset()}>
          Lưu khuôn
        </Button>
      </Group>

      {dataErr && (
        <Alert icon={<IconAlertTriangle size={18} />} color="red" title="Chưa đọc được dữ liệu" m="md">
          {dataErr}
        </Alert>
      )}

      <div className="produce-body">
        <Card withBorder radius="lg" padding="lg">
          <Title order={5} mb="sm">
            Nguồn dữ liệu
          </Title>
          <Stack gap="sm">
            <TextInput
              label="Tên khuôn"
              value={draft.name}
              onChange={(e) => setD({ name: e.currentTarget.value })}
            />
            <SimpleGrid cols={2} spacing="sm">
              <Select
                label="Sheet"
                placeholder="— Chọn sheet —"
                value={draft.sheet || null}
                data={sheets.map((s) => ({ value: s.sheet, label: `${s.label} (${s.rows})` }))}
                onChange={(v) => void chooseSheet(v ?? "")}
              />
              <Select
                label="Lọc theo cột"
                placeholder="— Không lọc —"
                clearable
                value={draft.filterField || null}
                data={columns}
                onChange={(v) => setD({ filterField: v ?? "" })}
              />
              <TextInput
                label="Giá trị lọc"
                placeholder="vd: An Toi"
                value={draft.filterValue}
                onChange={(e) => setD({ filterValue: e.currentTarget.value })}
              />
              <NumberInput
                label="Giới hạn dòng (trống = tất cả)"
                min={0}
                value={draft.limit === "" ? "" : Number(draft.limit)}
                onChange={(v) => setD({ limit: v === "" || v == null ? "" : String(v) })}
              />
              <NumberInput
                label="Ảnh / mục"
                min={0}
                value={draft.perItem}
                onChange={(v) => setD({ perItem: typeof v === "number" ? v : 0 })}
              />
              <NumberInput
                label="Ảnh / bộ"
                min={0}
                value={draft.perSet}
                onChange={(v) => setD({ perSet: typeof v === "number" ? v : 0 })}
              />
            </SimpleGrid>
          </Stack>
        </Card>

        <Card withBorder radius="lg" padding="lg">
          <Title order={5} mb="sm">
            Số lượng & Xuất
          </Title>
          <Stack gap="sm">
            <NumberInput
              label="Số bộ muốn sinh"
              min={1}
              value={draft.randomSetCount}
              onChange={(v) => setD({ randomSetCount: typeof v === "number" ? v : 1 })}
            />
            <Text size="xs" c={notEnough ? "red" : "dimmed"}>
              Mỗi bộ cần {rowsNeededPerSet} dòng dữ liệu · có {candidateCount} dòng sau lọc
              {notEnough ? " — không đủ!" : ""}
            </Text>
            <SimpleGrid cols={2} spacing="sm">
              <Box>
                <Text size="sm" fw={500} mb={4}>
                  Định dạng
                </Text>
                <SegmentedControl
                  fullWidth
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
                min={10}
                max={100}
                value={draft.quality}
                onChange={(v) => setD({ quality: typeof v === "number" ? v : 90 })}
              />
            </SimpleGrid>
          </Stack>
        </Card>

        <Card withBorder radius="lg" padding="lg" className="full">
          <Title order={5} mb="sm">
            Gán dữ liệu theo trang
          </Title>
          {pages.length === 0 ? (
            <Text c="dimmed" size="sm">
              Chọn một bộ mẫu để hiển thị các trang.
            </Text>
          ) : (
            <Accordion variant="separated" radius="md" multiple defaultValue={pages.map((p) => p.pageId)}>
              {pages.map((p) => (
                <Accordion.Item key={p.pageId} value={p.pageId}>
                  <Accordion.Control>
                    <Text fw={600} size="sm">
                      {p.name}
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    {p.elements.length === 0 ? (
                      <Text c="dimmed" size="sm">
                        Trang này không có đối tượng gán được.
                      </Text>
                    ) : (
                      <ProduceBindingsPanel
                        draft={draft}
                        setD={setD}
                        elements={p.elements}
                        dataGroups={p.dataGroups}
                        canonFields={canonFields}
                      />
                    )}
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </Card>

        {result && (
          <Card withBorder radius="lg" padding="lg" className="full">
            <Group justify="space-between" mb="sm">
              <Title order={5}>Kết quả ({result.summaries.length} bộ)</Title>
              <Button
                variant="light"
                leftSection={<IconFolderOpen size={18} />}
                onClick={() => void openPath(result.dest.replace(/[\\/][^\\/]*$/, ""))}
              >
                Mở thư mục
              </Button>
            </Group>
            <Stack gap={2}>
              {result.summaries.map((s, i) => (
                <Text key={i} size="xs" c="dimmed">
                  {s}
                </Text>
              ))}
            </Stack>
          </Card>
        )}
      </div>

      <Group className="produce-actions" gap="md">
        <Button
          leftSection={<IconDownload size={18} />}
          onClick={() => void generateAndExport()}
          disabled={busy || !templateSet || !draft.sheet || notEnough}
          loading={busy}
        >
          Sinh & Xuất
        </Button>
        {progress.total > 0 && (
          <Box style={{ flex: 1 }}>
            <Progress value={percent} animated={busy} />
          </Box>
        )}
        {progress.total > 0 && (
          <Text c="dimmed" size="sm">
            {progress.done}/{progress.total}
          </Text>
        )}
      </Group>
    </div>
  );
}
