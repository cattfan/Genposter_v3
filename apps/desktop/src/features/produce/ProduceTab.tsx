import { useEffect, useMemo, useState } from "react";
import { open as openPath } from "@tauri-apps/plugin-shell";
import { save } from "@tauri-apps/plugin-dialog";
import { Alert, Box, Button, Card, Group, Progress, Select, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconDeviceFloppy,
  IconDownload,
  IconFolderOpen,
  IconSparkles,
} from "@tabler/icons-react";
import type { TemplateSet } from "@genposter/schema";

import { aiConfigured, generateCaptions, setItemNames } from "../../lib/ai.js";
import { buildGenerate, countCandidates } from "../../lib/generate.js";
import { sheetColumns, listSheets, type SheetInfo } from "../../lib/excel.js";
import { loadMapping } from "../../lib/mapping.js";
import {
  renderSets,
  revokeRenderedSets,
  zipRendered,
  type RenderedSet,
} from "../../lib/render.js";
import {
  deleteRecipe,
  duplicateRecipe,
  listRecipes,
  loadRecipe,
  renameRecipe,
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
import { renderPagePreviews, type PagePreviewData } from "./page-preview.js";
import { KhuonEditor } from "./KhuonEditor.js";
import { ProduceHome } from "./ProduceHome.js";
import { SetReviewGallery } from "./SetReviewGallery.js";
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
  const [previews, setPreviews] = useState<PagePreviewData[]>([]);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [stageMsg, setStageMsg] = useState("");
  const [candidateCount, setCandidateCount] = useState(0);
  const [dataErr, setDataErr] = useState<string | null>(null);
  const [view, setView] = useState<"home" | "editor" | "review">("home");

  // Generated output held for review/export.
  const [rendered, setRendered] = useState<RenderedSet[] | null>(null);
  const [captions, setCaptions] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [summaries, setSummaries] = useState<Record<number, string[]>>({});
  const [result, setResult] = useState<{ dest: string; count: number } | null>(null);

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

  const boundIds = useMemo(
    () =>
      new Set(
        Object.entries(draft.bindings)
          .filter(([, v]) => v)
          .map(([k]) => k),
      ),
    [draft.bindings],
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

  function clearGenerated() {
    if (rendered) revokeRenderedSets(rendered);
    setRendered(null);
    setCaptions({});
    setSelected(new Set());
    setSummaries({});
    setResult(null);
  }

  async function chooseSet(id: string, base?: Draft) {
    if (!id) {
      setTemplateSet(null);
      setPages([]);
      setPreviews([]);
      return;
    }
    try {
      const set = await loadTemplateSet(id);
      const pe = extractSetPages(set);
      setTemplateSet(set);
      setPages(pe);
      setDraft((d) => mergeElements({ ...(base ?? d), templateId: id }, allElements(pe)));
      // Render page previews in the background; saved thumbnails show meanwhile.
      setPreviews(
        set.pages.map((p) => ({ pageId: p.id, img: p.thumbnail ?? "", boxes: [] })),
      );
      void renderPagePreviews(set)
        .then(setPreviews)
        .catch(() => {
          /* keep thumbnail fallback */
        });
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

  async function openRecipe(id: string) {
    clearGenerated();
    await chooseRecipe(id);
    setView("editor");
  }

  async function createRecipe(templateId: string, name: string) {
    clearGenerated();
    setColumns([]);
    setCanonFields([]);
    const base = { ...emptyDraft(templateId), name: name || "Khuôn mới" };
    await chooseSet(templateId, base);
    setView("editor");
  }

  async function backToHome() {
    clearGenerated();
    setRecipes(await listRecipes());
    setView("home");
  }

  async function handleDuplicate(id: string) {
    try {
      await duplicateRecipe(id);
      setRecipes(await listRecipes());
      ok("Đã nhân bản khuôn");
    } catch (e) {
      fail(`Lỗi nhân bản: ${String(e)}`);
    }
  }

  async function handleRename(id: string, name: string) {
    try {
      await renameRecipe(id, name);
      setRecipes(await listRecipes());
    } catch (e) {
      fail(`Lỗi đổi tên: ${String(e)}`);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Xoá khuôn "${name}"? Không thể hoàn tác.`)) return;
    try {
      await deleteRecipe(id);
      setRecipes(await listRecipes());
    } catch (e) {
      fail(`Lỗi xoá: ${String(e)}`);
    }
  }

  /** Step 1: generate + render all sets in memory, then open the review view. */
  async function generateNow() {
    if (!templateSet) return;
    setBusy(true);
    setProgress({ done: 0, total: 0 });
    setStageMsg("Đang dựng dữ liệu…");
    try {
      const recipe = draftToRecipe(draft, allElements(pages));
      const payload = await buildGenerate(templateSet, recipe);

      setStageMsg("Đang render ảnh…");
      const r = await renderSets(templateSet, payload, recipe, {
        onProgress: (done, total) => setProgress({ done, total }),
      });

      const sums: Record<number, string[]> = {};
      for (const s of payload.sets) sums[s.setIndex] = setItemNames(s);

      // Render finished — clear the bar so caption progress reads cleanly.
      setProgress({ done: 0, total: 0 });

      let caps: Record<number, string> = {};
      if (draft.captionEnabled) {
        if (aiConfigured()) {
          setStageMsg("Đang sinh caption AI…");
          caps = await generateCaptions(recipe, payload.sets, (done, total) =>
            setStageMsg(`Đang sinh caption AI… ${done}/${total}`),
          );
        } else {
          notifications.show({
            color: "yellow",
            message: "Chưa cấu hình AI API — bỏ qua caption. Vào tab Cài đặt để cấu hình.",
          });
        }
      }

      if (rendered) revokeRenderedSets(rendered);
      setRendered(r);
      setCaptions(caps);
      setSelected(new Set(r.map((s) => s.setIndex)));
      setSummaries(sums);
      setResult(null);
      setView("review");
    } catch (e) {
      fail(`Lỗi sinh ảnh: ${String(e)}`);
    } finally {
      setBusy(false);
      setStageMsg("");
    }
  }

  /** Step 2: zip only the selected sets and write wherever the user picks. */
  async function exportSelected() {
    if (!rendered) return;
    const chosen = rendered.filter((s) => selected.has(s.setIndex));
    if (!chosen.length) {
      fail("Chưa chọn bộ nào để xuất.");
      return;
    }
    try {
      await ensureDir(paths.outputDir());
      const dest = await save({
        defaultPath: join(paths.outputDir(), timestampZipName()),
        filters: [{ name: "Zip", extensions: ["zip"] }],
      });
      if (!dest) return;
      setBusy(true);
      const { zipBytes, fileCount } = zipRendered(chosen, captions, draft.format);
      await writeBytes(dest, zipBytes);
      setResult({ dest, count: chosen.length });
      ok(`Đã xuất ${chosen.length} bộ (${fileCount} file).`);
    } catch (e) {
      fail(`Lỗi xuất ảnh: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  function toggleSet(setIndex: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(setIndex)) next.delete(setIndex);
      else next.add(setIndex);
      return next;
    });
  }

  const allSelected = rendered !== null && selected.size === rendered.length;

  function toggleAll() {
    if (!rendered) return;
    setSelected(allSelected ? new Set() : new Set(rendered.map((s) => s.setIndex)));
  }

  const percent = progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  const dataAlert = dataErr && (
    <Alert icon={<IconAlertTriangle size={18} />} color="red" title="Chưa đọc được dữ liệu" m="md">
      {dataErr}
    </Alert>
  );

  if (view === "home") {
    return (
      <div className="produce">
        {dataAlert}
        <ProduceHome
          recipes={recipes}
          sets={sets}
          onOpen={(id) => void openRecipe(id)}
          onCreate={(templateId, name) => void createRecipe(templateId, name)}
          onDuplicate={(id) => void handleDuplicate(id)}
          onRename={(id, name) => void handleRename(id, name)}
          onDelete={(id, name) => void handleDelete(id, name)}
        />
      </div>
    );
  }

  if (view === "review" && rendered) {
    return (
      <div className="produce">
        <Group className="produce-head" gap="md" align="center" wrap="wrap">
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconArrowLeft size={18} />}
            onClick={() => setView("editor")}
          >
            Chỉnh khuôn
          </Button>
          <Box mr="auto">
            <Title order={3}>Xem trước — {draft.name || "Khuôn"}</Title>
            <Text c="dimmed" size="sm">
              Bỏ chọn bộ không ưng rồi bấm Xuất ảnh
            </Text>
          </Box>
          <Button variant="default" onClick={toggleAll}>
            {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </Button>
          <Button
            leftSection={<IconDownload size={18} />}
            onClick={() => void exportSelected()}
            disabled={busy || selected.size === 0}
            loading={busy}
          >
            Xuất ảnh ({selected.size} bộ)
          </Button>
        </Group>

        <div className="review-body">
          <SetReviewGallery
            rendered={rendered}
            captions={captions}
            selected={selected}
            summaries={summaries}
            captionEnabled={draft.captionEnabled}
            onToggle={toggleSet}
            onCaptionChange={(i, c) => setCaptions((prev) => ({ ...prev, [i]: c }))}
          />

          {result && (
            <Card withBorder radius="lg" padding="lg">
              <Group justify="space-between">
                <Text size="sm">
                  Đã xuất {result.count} bộ → <b>{result.dest}</b>
                </Text>
                <Button
                  variant="light"
                  leftSection={<IconFolderOpen size={18} />}
                  onClick={() => void openPath(result.dest.replace(/[\\/][^\\/]*$/, ""))}
                >
                  Mở thư mục
                </Button>
              </Group>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="produce">
      <Group className="produce-head" gap="md" align="flex-end" wrap="wrap">
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={18} />}
          onClick={() => void backToHome()}
        >
          Khuôn
        </Button>
        <Box mr="auto">
          <Title order={3}>{draft.name || "Khuôn mới"}</Title>
          <Text c="dimmed" size="sm">
            Gán dữ liệu theo trang, sinh nhiều bộ ngẫu nhiên
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
        <Button leftSection={<IconDeviceFloppy size={18} />} onClick={() => void savePreset()}>
          Lưu khuôn
        </Button>
      </Group>

      {dataAlert}

      <KhuonEditor
        draft={draft}
        setD={setD}
        pages={pages}
        previews={previews}
        sheets={sheets}
        columns={columns}
        canonFields={canonFields}
        boundIds={boundIds}
        rowsNeededPerSet={rowsNeededPerSet}
        candidateCount={candidateCount}
        notEnough={notEnough}
        onChooseSheet={(s) => void chooseSheet(s)}
      />

      <Group className="produce-actions" gap="md">
        <Button
          leftSection={<IconSparkles size={18} />}
          onClick={() => void generateNow()}
          disabled={busy || !templateSet || !draft.sheet || notEnough}
          loading={busy}
        >
          Sinh ảnh ({draft.randomSetCount} bộ)
        </Button>
        {rendered && !busy && (
          <Button variant="light" onClick={() => setView("review")}>
            Xem bộ đã sinh ({rendered.length})
          </Button>
        )}
        {progress.total > 0 && busy && (
          <Box style={{ flex: 1 }}>
            <Progress value={percent} animated />
          </Box>
        )}
        {busy && (
          <Text c="dimmed" size="sm">
            {stageMsg || `${progress.done}/${progress.total}`}
          </Text>
        )}
      </Group>
    </div>
  );
}
