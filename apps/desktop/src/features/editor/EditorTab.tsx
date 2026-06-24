import { useEffect, useRef, useState } from "react";
import type { TemplateSet } from "@genposter/schema";

import { CanvasContextMenu } from "./CanvasContextMenu.js";
import { ContextBar } from "./ContextBar.js";
import { InspectorDrawer } from "./InspectorDrawer.js";
import { LeftPanel } from "./LeftPanel.js";
import { PageStrip } from "./PageStrip.js";
import { RightRail } from "./RightRail.js";
import { Toolbar } from "./Toolbar.js";
import type { EditorApi } from "./useEditor.js";
import "./editor.css";

const INSPECTOR_KEY = "genposter.editor.inspectorOpen";

function readInspectorOpen(): boolean {
  try {
    return localStorage.getItem(INSPECTOR_KEY) === "true";
  } catch {
    return false;
  }
}

export function EditorTab({
  ed,
  set,
  pageIndex,
  saving,
  onBack,
  onSave,
  onRenameSet,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onReorderPages,
}: {
  ed: EditorApi;
  set: TemplateSet | null;
  pageIndex: number;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
  onRenameSet: (name: string) => void;
  onSelectPage: (i: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (i: number) => void;
  onDeletePage: (i: number) => void;
  onReorderPages: (from: number, to: number) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [inspectorOpen, setInspectorOpen] = useState(readInspectorOpen);

  useEffect(() => {
    try {
      localStorage.setItem(INSPECTOR_KEY, String(inspectorOpen));
    } catch {
      /* ignore */
    }
  }, [inspectorOpen]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !ed.ready) return;
    const fit = () => {
      const cw = stage.clientWidth - 48;
      const ch = stage.clientHeight - 48;
      if (cw < 80 || ch < 80) return;
      ed.fitTo(cw, ch);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [ed.ready, set?.width, set?.height]); // eslint-disable-line react-hooks/exhaustive-deps

  const pages = set?.pages ?? [];
  const aspect = set ? set.width / set.height : 0.7;
  const pageLabel = set ? `Trang ${Math.min(pageIndex + 1, pages.length)}/${pages.length}` : "";

  return (
    <div className="editor">
      <Toolbar
        ed={ed}
        name={set?.name ?? ""}
        onName={onRenameSet}
        onBack={onBack}
        onSave={onSave}
        saving={saving}
        pageLabel={pageLabel}
      />
      <div className="editor-body">
        <LeftPanel ed={ed} />
        <div className="stage-column">
          <ContextBar ed={ed} />
          <div className="stage" ref={stageRef}>
            <CanvasContextMenu ed={ed} />
            <div className="stage-wrap">
              <canvas ref={ed.canvasElRef} />
            </div>
          </div>
          <InspectorDrawer
            ed={ed}
            opened={inspectorOpen}
            onClose={() => setInspectorOpen(false)}
          />
        </div>
        <RightRail active={inspectorOpen} onToggle={() => setInspectorOpen((o) => !o)} />
      </div>
      <PageStrip
        pages={pages}
        currentIndex={pageIndex}
        aspect={aspect}
        onSelect={onSelectPage}
        onAdd={onAddPage}
        onDuplicate={onDuplicatePage}
        onDelete={onDeletePage}
        onReorder={onReorderPages}
      />
    </div>
  );
}
