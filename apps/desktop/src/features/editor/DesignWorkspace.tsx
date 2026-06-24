import { useCallback, useReducer, useRef, useState } from "react";
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
  const [view, setView] = useState<"home" | "editor">("home");
  const [pageIndex, setPageIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [, bump] = useReducer((x) => x + 1, 0);

  const viewRef = useRef(view);
  const pageIndexRef = useRef(pageIndex);
  viewRef.current = view;
  pageIndexRef.current = pageIndex;

  const savingRef = useRef(false);
  const pendingRef = useRef(false);

  const autoSaveRef = useRef<() => void>(() => {});

  const ed = useEditor({ onSceneChange: () => autoSaveRef.current() });

  const autoSave = useCallback(async () => {
    if (viewRef.current !== "editor" || !setRef.current) return;
    if (savingRef.current) {
      pendingRef.current = true;
      return;
    }
    savingRef.current = true;
    setSaveStatus("saving");
    try {
      const set = setRef.current;
      if (!set) return;
      const p = set.pages[pageIndexRef.current];
      if (p) {
        p.scene = ed.exportScene();
        try {
          p.thumbnail = await renderThumb(p.scene, set.width, set.height);
        } catch {
          /* keep previous thumbnail */
        }
      }
      await saveTemplateSet(set);
      setSaveStatus("saved");
    } catch (e) {
      setSaveStatus("error");
      notifications.show({ color: "red", message: `Lỗi lưu: ${String(e)}` });
    } finally {
      savingRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        void autoSave();
      }
    }
  }, [ed]);

  autoSaveRef.current = () => void autoSave();

  async function openSet(setId: string, pageId?: string) {
    try {
      const set = await loadTemplateSet(setId);
      setRef.current = set;
      let idx = 0;
      if (pageId === "__add__") {
        set.pages.push(emptyPage());
        idx = set.pages.length - 1;
      } else if (pageId) {
        const found = set.pages.findIndex((p) => p.id === pageId);
        idx = found >= 0 ? found : 0;
      }
      setPageIndex(idx);
      setView("editor");
      setSaveStatus("saved");
      loadPageIntoEditor(set, idx);
      bump();
    } catch (e) {
      notifications.show({ color: "red", message: `Lỗi mở mẫu: ${String(e)}` });
    }
  }

  function loadPageIntoEditor(set: TemplateSet, i: number) {
    ed.setCanvasSize(set.width, set.height);
    void ed.loadScene(set.pages[i]!.scene);
  }

  async function goHome() {
    await autoSave();
    setView("home");
    bump();
  }

  async function selectPage(i: number) {
    const set = setRef.current;
    if (!set || i === pageIndex) return;
    await autoSave();
    setPageIndex(i);
    loadPageIntoEditor(set, i);
    bump();
  }

  async function addPage() {
    const set = setRef.current;
    if (!set) return;
    await autoSave();
    set.pages.push(emptyPage());
    const i = set.pages.length - 1;
    setPageIndex(i);
    loadPageIntoEditor(set, i);
    bump();
  }

  async function duplicatePage(i: number) {
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
    loadPageIntoEditor(set, i + 1);
    bump();
  }

  async function deletePage(i: number) {
    const set = setRef.current;
    if (!set || set.pages.length <= 1) return;
    await autoSave();
    set.pages.splice(i, 1);
    const ni = Math.min(pageIndex, set.pages.length - 1);
    setPageIndex(ni);
    loadPageIntoEditor(set, ni);
    bump();
  }

  function reorderPages(from: number, to: number) {
    const set = setRef.current;
    if (!set || from === to) return;
    const curId = set.pages[pageIndex]?.id;
    const [moved] = set.pages.splice(from, 1);
    const target = from < to ? to - 1 : to;
    set.pages.splice(target, 0, moved!);
    const ni = set.pages.findIndex((p) => p.id === curId);
    setPageIndex(ni < 0 ? target : ni);
    void autoSave();
    bump();
  }

  function renameSet(name: string) {
    const set = setRef.current;
    if (!set) return;
    set.name = name;
    bump();
  }

  function onNameBlur() {
    void autoSave();
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
          onReorderPages={reorderPages}
        />
      </div>
    </>
  );
}
