import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { open as openPath } from "@tauri-apps/plugin-shell";
import { save } from "@tauri-apps/plugin-dialog";
import { Alert, Box, Button, Group, Progress, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconDownload,
  IconFolderOpen,
  IconSparkles,
} from "@tabler/icons-react";
import type { GeneratedSet, TemplateSet } from "@genposter/schema";

import { aiConfigured, generateCaptions } from "../../lib/ai.js";
import { buildGenerate, countCandidates, DataNotSyncedError } from "../../lib/generate.js";
import type { SheetInfo } from "../../lib/excel.js";
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
import { listCachedSheets, cachedSheetColumns } from "../../lib/sync.js";
import { lastUpdateStatus, onUpdateStatus } from "../../lib/update-poller.js";
import { timestampZipName } from "../../lib/zip.js";
import { ConfirmModal } from "../../components/ConfirmModal.js";
import { allElements, extractSetPages, type PageElements } from "./elements.js";
import { renderPagePreviews, type PagePreviewData } from "./page-preview.js";
import { GeneratedSetsPanel } from "./GeneratedSetsPanel.js";
import { KhuonEditor } from "./KhuonEditor.js";
import { ProduceHome } from "./ProduceHome.js";
import { ProduceStatusBar } from "./ProduceStatusBar.js";
import { bindingStats, validateBindings } from "./options.js";
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

export function ProduceTab({ active = true }: { active?: boolean }) {
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
  // Distinct from "0 rows after filter" — the server cache has never been
  // synced, so candidateCount is meaningless until the user syncs.
  const [candidateNotSynced, setCandidateNotSynced] = useState(false);
  const [dataErr, setDataErr] = useState<string | null>(null);
  const [view, setView] = useState<"home" | "editor">("home");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Generated output held for preview/export (shown under the workspace).
  const [rendered, setRendered] = useState<RenderedSet[] | null>(null);
  const [genSets, setGenSets] = useState<GeneratedSet[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<{ dest: string; count: number } | null>(null);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(100);

  const skipAutoSaveRef = useRef(true);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  const setD = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const autoSaveRecipe = useCallback(async () => {
    if (!templateSet || pagesRef.current.length === 0) return;
    try {
      const recipe = draftToRecipe(draft, allElements(pagesRef.current));
      const id = await saveRecipe(recipe);
      setRecipes(await listRecipes());
      if (draft.id !== id) setDraft((d) => ({ ...d, id }));
    } catch (e) {
      fail(`Lỗi lưu khuôn: ${String(e)}`);
    }
  }, [draft, templateSet]);

  useEffect(() => {
    if (view !== "editor") {
      skipAutoSaveRef.current = true;
      return;
    }
    if (!templateSet) return;
    skipAutoSaveRef.current = true;
    const enable = window.setTimeout(() => {
      skipAutoSaveRef.current = false;
    }, 200);
    return () => window.clearTimeout(enable);
  }, [view, templateSet?.id]);

  useEffect(() => {
    if (view !== "editor" || skipAutoSaveRef.current || !templateSet) return;
    const timer = window.setTimeout(() => void autoSaveRecipe(), 700);
    return () => window.clearTimeout(timer);
  }, [draft, view, templateSet, autoSaveRecipe]);

  async function refreshSheets() {
    try {
      setSheets(await listCachedSheets());
      setDataErr(null);
    } catch (e) {
      setDataErr(
        `Chưa có cache dữ liệu. Vào tab Dữ liệu → Cập nhật ngay. (${String(e)})`,
      );
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        setSets(await listTemplateSets());
        setRecipes(await listRecipes());
      } catch (e) {
        fail(`Không đọc được mẫu/khuôn: ${String(e)}`);
      }
      await refreshSheets();
    })();
    const onSynced = () => void refreshSheets();
    window.addEventListener("genposter:data-synced", onSynced);
    return () => window.removeEventListener("genposter:data-synced", onSynced);
  }, []);

  // Tabs stay mounted, so the mount-time load above runs only once. Re-read
  // templates/recipes whenever the user switches to this tab to pick up sets
  // created in the Design tab since then.
  useEffect(() => {
    if (!active) return;
    void (async () => {
      try {
        setSets(await listTemplateSets());
        setRecipes(await listRecipes());
      } catch {
        // Keep the current lists; the mount-time load already reported errors.
      }
    })();
  }, [active]);

  const rowsNeededPerSet = useMemo(
    () =>
      templateSet ? buildKhuonPlan(templateSet, draft.bindings).rowsNeededPerSet : 0,
    [templateSet, draft.bindings],
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
        if (cancelled) return;
        setCandidateCount(n);
        setCandidateNotSynced(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setCandidateCount(0);
        // Keep "not synced" distinguishable from a real 0-rows-after-filter
        // result, so the UI can point the user at Data → Cập nhật ngay
        // instead of implying their filter matched nothing.
        setCandidateNotSynced(e instanceof DataNotSyncedError);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.sheet, draft.filterField, draft.filterValue, draft.limit]);

  const notEnough = rowsNeededPerSet > 0 && candidateCount < rowsNeededPerSet;

  const bindable = useMemo(() => allElements(pages), [pages]);
  const { bound: boundCount, total: totalBindable } = useMemo(
    () => bindingStats(draft.bindings, bindable),
    [draft.bindings, bindable],
  );
  const bindingIssues = useMemo(
    () => validateBindings(draft.bindings, bindable),
    [draft.bindings, bindable],
  );

  // lastUpdateStatus() alone only reflects the poller's state at render
  // time — subscribe so the warning updates as soon as a background poll
  // or manual sync changes it, instead of waiting on an unrelated re-render.
  const [dataStale, setDataStale] = useState(
    () => lastUpdateStatus()?.reason === "stale",
  );
  useEffect(() => {
    setDataStale(lastUpdateStatus()?.reason === "stale");
    return onUpdateStatus((st) => setDataStale(st.reason === "stale"));
  }, []);

  function getGenerateBlockReason(): string | null {
    if (busy) return "Đang xử lý…";
    if (!templateSet) return "Chưa có bộ mẫu";
    if (!draft.sheet) return "Chọn bảng dữ liệu bên trái";
    if (candidateNotSynced) {
      return "Chưa đồng bộ dữ liệu từ server — vào tab Dữ liệu bấm Cập nhật ngay.";
    }
    if (bindingIssues.length > 0) {
      const names = bindingIssues.slice(0, 3).map((i) => i.label);
      const extra = bindingIssues.length > 3 ? ` (+${bindingIssues.length - 3})` : "";
      return `Chưa gán xong: ${names.join(", ")}${extra}`;
    }
    if (notEnough) {
      return `Không đủ dòng (cần ${rowsNeededPerSet}, có ${candidateCount})`;
    }
    return null;
  }

  const generateBlockReason = getGenerateBlockReason();
  const canGenerate = !generateBlockReason;

  const templateKey = `${draft.id || "new"}:${templateSet?.id ?? ""}`;

  function clearGenerated() {
    if (rendered) revokeRenderedSets(rendered);
    setRendered(null);
    setGenSets([]);
    setSelected(new Set());
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
      setColumns(await cachedSheetColumns(sheet));
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
      // chooseSet already stores the draft merged with element hints —
      // overwriting it with `d` afterwards would drop those prefills.
      await chooseSet(r.templateId, d);
      await chooseSheet(r.data.sheet);
      ok(`Đã mở khuôn: ${r.name}`);
    } catch (e) {
      fail(`Lỗi mở khuôn: ${String(e)}`);
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
    try {
      const cached = await listCachedSheets();
      if (cached.length === 1) {
        await chooseSheet(cached[0]!.sheet);
        ok(`Đã chọn bảng: ${cached[0]!.label}`);
      }
    } catch {
      /* sheet auto-pick optional */
    }
    setView("editor");
  }

  async function backToHome() {
    if (!skipAutoSaveRef.current && templateSet) await autoSaveRecipe();
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

  async function handleDelete(id: string) {
    try {
      await deleteRecipe(id);
      setRecipes(await listRecipes());
    } catch (e) {
      fail(`Lỗi xoá: ${String(e)}`);
    }
  }

  /** Step 1: generate + render all sets in memory — pure preview, no captions. */
  async function generateNow() {
    if (!templateSet || !canGenerate) return;
    if (lastUpdateStatus()?.reason === "stale") {
      notifications.show({
        color: "yellow",
        message: "Dữ liệu trên máy chưa phải bản mới nhất — vào tab Dữ liệu để cập nhật.",
      });
    }
    if (!aiConfigured() && Object.values(draft.bindings).some((b) => b.startsWith("ai:"))) {
      // applyAiBindings silently no-ops without a key, so these elements
      // would render blank with no explanation unless we warn up front.
      notifications.show({
        color: "yellow",
        message: "Chưa cấu hình AI API — các vùng AI sẽ để trống. Vào tab Cài đặt để cấu hình.",
      });
    }
    setBusy(true);
    setProgress({ done: 0, total: 0 });
    setStageMsg("Đang dựng dữ liệu…");
    try {
      const recipe = draftToRecipe(draft, allElements(pages));
      const payload = await buildGenerate(templateSet, recipe, {
        onAiProgress: (done, total) => {
          setStageMsg(`Đang sinh chữ AI… ${done}/${total}`);
          setProgress({ done, total });
        },
      });

      setStageMsg("Đang render ảnh…");
      const { sets: r, errors } = await renderSets(templateSet, payload, recipe, {
        onProgress: (done, total) => setProgress({ done, total }),
      });

      if (rendered) revokeRenderedSets(rendered);
      setRendered(r);
      setGenSets(payload.sets);
      setSelected(new Set(r.map((s) => s.setIndex)));
      setResult(null);
      setPreviewCollapsed(false);

      if (errors.length > 0) {
        // Render failures drop only the affected set (see renderSets) so the
        // rest of the batch still succeeds — but the user must know some
        // sets are missing and why, instead of silently getting fewer sets
        // than requested.
        const failedSets = new Set(errors.map((e) => e.setIndex));
        notifications.show({
          color: "yellow",
          message: `${r.length} bộ đã sinh thành công, ${failedSets.size} bộ lỗi khi render và đã bị bỏ qua: ${errors[0]!.message}`,
        });
      }
    } catch (e) {
      fail(`Lỗi sinh ảnh: ${String(e)}`);
    } finally {
      setBusy(false);
      setStageMsg("");
      setProgress({ done: 0, total: 0 });
    }
  }

  /** Step 2: caption (AI, only now) + zip the selected sets wherever the user picks. */
  async function exportSelected() {
    if (!rendered) return;
    const chosen = rendered.filter((s) => selected.has(s.setIndex));
    if (!chosen.length) {
      fail("Chưa chọn bộ nào để xuất.");
      return;
    }
    try {
      // recipe.output.dir (defaults to output/<khuôn-id> — see draftToRecipe)
      // is where the save dialog opens, so a saved recipe's export folder is
      // actually honored instead of always landing under the same output/.
      const recipe = draftToRecipe(draft, allElements(pages));
      const outDir = paths.outputSub(recipe.output.dir);
      await ensureDir(outDir);
      const dest = await save({
        defaultPath: join(outDir, timestampZipName()),
        filters: [{ name: "Zip", extensions: ["zip"] }],
      });
      if (!dest) return;
      setBusy(true);

      // Captions are generated at export time, for the selected sets only,
      // and land in each set's caption.txt inside the zip.
      let captions: Record<number, string> = {};
      if (draft.captionEnabled) {
        if (aiConfigured()) {
          const chosenSets = genSets.filter((s) => selected.has(s.setIndex));
          setStageMsg("Đang sinh caption AI…");
          captions = await generateCaptions(recipe, chosenSets, (done, total) =>
            setStageMsg(`Đang sinh caption AI… ${done}/${total}`),
          );
        } else {
          notifications.show({
            color: "yellow",
            message: "Chưa cấu hình AI API — bỏ qua caption. Vào tab Cài đặt để cấu hình.",
          });
        }
      }

      setStageMsg("Đang nén file…");
      const { zipBytes, fileCount } = zipRendered(chosen, captions, draft.format);
      await writeBytes(dest, zipBytes);
      setResult({ dest, count: chosen.length });
      ok(`Đã xuất ${chosen.length} bộ (${fileCount} file).`);
    } catch (e) {
      fail(`Lỗi xuất ảnh: ${String(e)}`);
    } finally {
      setBusy(false);
      setStageMsg("");
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
          onDelete={(id, name) => setDeleteTarget({ id, name })}
        />
        <ConfirmModal
          opened={deleteTarget !== null}
          title="Xoá khuôn"
          message={`Xoá khuôn "${deleteTarget?.name ?? ""}"? Không thể hoàn tác.`}
          onConfirm={() => {
            if (deleteTarget) void handleDelete(deleteTarget.id);
          }}
          onClose={() => setDeleteTarget(null)}
        />
      </div>
    );
  }

  return (
    <div className="produce">
      <Group className="produce-head" gap="md" align="center" wrap="wrap">
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={18} />}
          onClick={() => void backToHome()}
        >
          Khuôn
        </Button>
        <Title order={3} mr="auto">
          {draft.name || "Khuôn mới"}
        </Title>
      </Group>

      {dataAlert}

      <ProduceStatusBar
        hasSheet={Boolean(draft.sheet)}
        boundCount={boundCount}
        totalBindable={totalBindable}
        notEnough={notEnough}
        notSynced={candidateNotSynced}
        rowsNeeded={rowsNeededPerSet}
        candidateCount={candidateCount}
        hasRendered={Boolean(rendered)}
        dataStale={Boolean(dataStale)}
      />

      <div className="produce-body">
        <div className="produce-editor-wrap">
          <KhuonEditor
            draft={draft}
            setD={setD}
            templateSet={templateSet}
            templateKey={templateKey}
            pages={pages}
            previews={previews}
            sheets={sheets}
            columns={columns}
            canonFields={canonFields}
            boundIds={boundIds}
            rowsNeededPerSet={rowsNeededPerSet}
            candidateCount={candidateCount}
            notEnough={notEnough}
            candidateNotSynced={candidateNotSynced}
            onChooseSheet={(s) => void chooseSheet(s)}
          />
        </div>

        {rendered && (
          <GeneratedSetsPanel
            rendered={rendered}
            selected={selected}
            allSelected={allSelected}
            collapsed={previewCollapsed}
            zoom={previewZoom}
            onToggleCollapse={() => setPreviewCollapsed((c) => !c)}
            onZoomChange={setPreviewZoom}
            onToggle={toggleSet}
            onToggleAll={toggleAll}
          />
        )}
      </div>

      <Group className="produce-actions" gap="md" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <Button
            leftSection={<IconSparkles size={18} />}
            onClick={() => void generateNow()}
            disabled={!canGenerate}
            loading={busy}
          >
            Sinh ảnh ({draft.randomSetCount} bộ)
          </Button>
          {rendered && (
            <Button
              variant="light"
              leftSection={<IconDownload size={18} />}
              onClick={() => void exportSelected()}
              disabled={busy || selected.size === 0}
            >
              Xuất ảnh ({selected.size} bộ)
            </Button>
          )}
          {result && !busy && (
            <Button
              variant="subtle"
              leftSection={<IconFolderOpen size={18} />}
              onClick={() => void openPath(result.dest.replace(/[\\/][^\\/]*$/, ""))}
            >
              Mở thư mục
            </Button>
          )}
        </Group>
        {!canGenerate && generateBlockReason && !busy && (
          <Text className="produce-actions-msg" size="xs" c="red" lineClamp={2}>
            {generateBlockReason}
          </Text>
        )}
        <Box className="produce-actions-progress">
          {busy ? (
            <>
              <Progress value={percent} animated mb={4} />
              <Text c="dimmed" size="xs" lineClamp={1}>
                {stageMsg || `${progress.done}/${progress.total}`}
              </Text>
            </>
          ) : null}
        </Box>
      </Group>
    </div>
  );
}
