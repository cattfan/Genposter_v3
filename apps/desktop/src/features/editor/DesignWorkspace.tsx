import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { notifications } from "@mantine/notifications";
import type { TemplateSet } from "@genposter/schema";

import { loadTemplateSet, saveTemplateSet } from "../../lib/templateset-io.js";
import { emptyPage, genId } from "../../lib/templateset-util.js";
import { renderThumb } from "../../lib/thumbnail.js";
import { DesignHome } from "./DesignHome.js";
import { EditorTab } from "./EditorTab.js";
import type { SaveStatus } from "./Toolbar.js";
import { useEditor } from "./useEditor.js";

export function DesignWorkspace() {
  const setRef = useRef<TemplateSet | null>(null);
  const [view, setViewState] = useState<"home" | "editor">("home");
  const [pageIndex, setPageIndexState] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [, bump] = useReducer((x) => x + 1, 0);

  // Authoritative for the save/navigation chain below — updated the instant
  // we decide to switch, not just on render. React state updates are async,
  // so a fast second operation reading `view`/`pageIndex` (the state values)
  // could still see the pre-switch page and race the flush (see runExclusive).
  const viewRef = useRef(view);
  const pageIndexRef = useRef(pageIndex);

  function setView(v: "home" | "editor") {
    viewRef.current = v;
    setViewState(v);
  }

  function setPageIndex(i: number) {
    pageIndexRef.current = i;
    setPageIndexState(i);
  }

  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const opQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const savedFadeRef = useRef<number | null>(null);

  const autoSaveRef = useRef<() => void>(() => {});
  const sceneChangeDebounceRef = useRef<number | null>(null);

  /** Drop a pending debounced save so it can't fire mid page-switch and write
   * the previous page's lastExported scene into the newly selected slot. */
  function cancelPendingSceneSave() {
    if (sceneChangeDebounceRef.current) {
      window.clearTimeout(sceneChangeDebounceRef.current);
      sceneChangeDebounceRef.current = null;
    }
  }

  const ed = useEditor({
    // Debounce the continuous-editing trigger (fires on every property tweak,
    // e.g. every tick while dragging a slider) so a full export + thumbnail
    // render + disk write doesn't run on every tick — only once the user
    // pauses. Deliberate saves (page switch, etc.) call autoSave() directly
    // and are unaffected, since they must flush immediately before proceeding.
    onSceneChange: () => {
      cancelPendingSceneSave();
      sceneChangeDebounceRef.current = window.setTimeout(() => {
        sceneChangeDebounceRef.current = null;
        autoSaveRef.current();
      }, 600);
    },
  });

  /**
   * Flush the active page's scene to disk. Overlapping calls coalesce into a
   * single queued follow-up run so every caller's returned promise resolves
   * only once the *latest* state is actually saved. Previously a call made
   * while a save was in flight resolved immediately after just flagging a
   * pending flag, so `selectPage` could switch pages before the flush that
   * targeted the old page had actually happened — leaving `exportScene()` to
   * run later against the already-loaded new page and write it into the
   * wrong slot.
   */
  const autoSave = useCallback((): Promise<void> => {
    cancelPendingSceneSave();
    if (viewRef.current !== "editor" || !setRef.current) return Promise.resolve();
    if (savingRef.current) {
      pendingRef.current = true;
      return saveChainRef.current;
    }
    savingRef.current = true;
    const run = (async () => {
      let more = true;
      while (more) {
        if (savedFadeRef.current) {
          window.clearTimeout(savedFadeRef.current);
          savedFadeRef.current = null;
        }
        setSaveStatus("saving");
        try {
          const set = setRef.current;
          const p = set?.pages[pageIndexRef.current];
          if (set && p) {
            p.scene = ed.exportScene();
            try {
              p.thumbnail = await renderThumb(p.scene, set.width, set.height);
            } catch {
              /* keep previous thumbnail */
            }
            await saveTemplateSet(set);
          }
          setSaveStatus("saved");
          // Fade back to idle so "Đã lưu" reads as a momentary confirmation
          // rather than a permanent label.
          savedFadeRef.current = window.setTimeout(() => setSaveStatus("idle"), 2000);
        } catch (e) {
          setSaveStatus("error");
          notifications.show({ color: "red", message: `Lỗi lưu: ${String(e)}` });
        }
        // Re-run once more if another caller queued a save while this one
        // was in flight, so their awaited promise (the same `run`) reflects
        // the latest state rather than resolving before it's flushed.
        more = pendingRef.current;
        pendingRef.current = false;
      }
      savingRef.current = false;
    })();
    saveChainRef.current = run;
    return run;
  }, [ed]);

  autoSaveRef.current = () => void autoSave();

  useEffect(
    () => () => {
      if (savedFadeRef.current) window.clearTimeout(savedFadeRef.current);
      cancelPendingSceneSave();
    },
    [],
  );

  // Best-effort flush when the window is hidden / app is closing — the 600ms
  // debounce alone would otherwise drop the last edits on quit.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && viewRef.current === "editor") {
        void autoSave();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [autoSave]);

  /**
   * Serializes page/set navigation so a fast second click can't start a new
   * loadScene() while the previous switch (flush old page + load new page)
   * is still running — two concurrent loadFromJSON calls on the same canvas
   * can interleave and leave it (and whatever gets saved from it) corrupt.
   */
  function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = opQueueRef.current.then(fn, fn);
    opQueueRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async function loadPageIntoEditor(set: TemplateSet, i: number) {
    ed.setCanvasSize(set.width, set.height);
    await ed.loadScene(set.pages[i]!.scene);
  }

  function openSet(setId: string, pageId?: string): Promise<void> {
    return runExclusive(async () => {
      try {
        const set = await loadTemplateSet(setId);
        setRef.current = set;
        let idx = 0;
        const isNewPage = pageId === "__add__";
        if (isNewPage) {
          set.pages.push(emptyPage());
          idx = set.pages.length - 1;
        } else if (pageId) {
          const found = set.pages.findIndex((p) => p.id === pageId);
          idx = found >= 0 ? found : 0;
        }
        setPageIndex(idx);
        setView("editor");
        // Just loaded from disk — nothing pending to report yet, and no
        // fade timer is set here, so avoid "saved" (which would otherwise
        // stick around forever; see the fade logic inside autoSave).
        setSaveStatus("idle");
        await loadPageIntoEditor(set, idx);
        // Persist a freshly added page right away — otherwise it only lives
        // in memory until the next edit, and a crash/quit loses it.
        if (isNewPage) await autoSave();
        bump();
      } catch (e) {
        notifications.show({ color: "red", message: `Lỗi mở mẫu: ${String(e)}` });
      }
    });
  }

  function goHome(): Promise<void> {
    return runExclusive(async () => {
      await autoSave();
      setView("home");
      bump();
    });
  }

  function selectPage(i: number): Promise<void> {
    return runExclusive(async () => {
      const set = setRef.current;
      if (!set || i === pageIndexRef.current) return;
      await autoSave();
      setPageIndex(i);
      await loadPageIntoEditor(set, i);
      bump();
    });
  }

  function addPage(): Promise<void> {
    return runExclusive(async () => {
      const set = setRef.current;
      if (!set) return;
      await autoSave();
      set.pages.push(emptyPage());
      const i = set.pages.length - 1;
      setPageIndex(i);
      await loadPageIntoEditor(set, i);
      // Persist the new page immediately — otherwise a crash/quit before the
      // next edit loses it (it only existed in memory until now).
      await autoSave();
      bump();
    });
  }

  function duplicatePage(i: number): Promise<void> {
    return runExclusive(async () => {
      const set = setRef.current;
      if (!set) return;
      await autoSave();
      const src = set.pages[i]!;
      set.pages.splice(i + 1, 0, {
        id: genId("page"),
        name: src.name,
        scene: JSON.parse(JSON.stringify(src.scene)),
        thumbnail: src.thumbnail,
      });
      setPageIndex(i + 1);
      await loadPageIntoEditor(set, i + 1);
      await autoSave();
      bump();
    });
  }

  function deletePage(i: number): Promise<void> {
    return runExclusive(async () => {
      const set = setRef.current;
      if (!set || set.pages.length <= 1) return;
      await autoSave();
      // Track the active page by id — deleting a page before it must not
      // shift which page a plain numeric index now points at.
      const curId = set.pages[pageIndexRef.current]?.id;
      set.pages.splice(i, 1);
      let ni = curId ? set.pages.findIndex((p) => p.id === curId) : -1;
      if (ni < 0) ni = Math.min(i, set.pages.length - 1);
      setPageIndex(ni);
      await loadPageIntoEditor(set, ni);
      await autoSave();
      bump();
    });
  }

  function reorderPages(from: number, to: number): Promise<void> {
    return runExclusive(async () => {
      const set = setRef.current;
      if (!set || from === to) return;
      const curId = set.pages[pageIndexRef.current]?.id;
      const [moved] = set.pages.splice(from, 1);
      const target = from < to ? to - 1 : to;
      set.pages.splice(target, 0, moved!);
      const ni = set.pages.findIndex((p) => p.id === curId);
      setPageIndex(ni < 0 ? target : ni);
      await autoSave();
      bump();
    });
  }

  function renameSet(name: string) {
    const set = setRef.current;
    if (!set) return;
    set.name = name;
    bump();
  }

  function renamePage(i: number, name: string): Promise<void> {
    return runExclusive(async () => {
      const set = setRef.current;
      if (!set || !set.pages[i]) return;
      set.pages[i]!.name = name || undefined;
      await autoSave();
      bump();
    });
  }

  function onNameBlur() {
    void autoSave();
  }

  function resizeCanvas(
    w: number,
    h: number,
    mode: "scaleContent" | "clipOnly",
  ): Promise<void> {
    return runExclusive(async () => {
      const set = setRef.current;
      if (!set) return;
      await autoSave();
      ed.resizeCanvasContent(w, h, mode);
      set.width = w;
      set.height = h;
      await autoSave();
      bump();
    });
  }

  return (
    <>
      {view === "home" && <DesignHome onOpen={(id, pid) => void openSet(id, pid)} />}
      <div style={{ display: view === "editor" ? "flex" : "none", flex: 1, minHeight: 0 }}>
        <EditorTab
          ed={ed}
          set={setRef.current}
          pageIndex={pageIndex}
          saveStatus={saveStatus}
          onRetrySave={() => void autoSave()}
          onBack={() => void goHome()}
          onRenameSet={renameSet}
          onNameBlur={onNameBlur}
          onSelectPage={(i) => void selectPage(i)}
          onAddPage={() => void addPage()}
          onDuplicatePage={(i) => void duplicatePage(i)}
          onDeletePage={(i) => void deletePage(i)}
          onReorderPages={(from, to) => void reorderPages(from, to)}
          onRenamePage={(i, name) => void renamePage(i, name)}
          onResizeCanvas={(w, h, mode) => void resizeCanvas(w, h, mode)}
        />
      </div>
    </>
  );
}
