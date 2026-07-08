import { useEffect, useRef, useState } from "react";
import type { TemplateSet } from "@genposter/schema";

import { CanvasContextMenu } from "./CanvasContextMenu.js";
import { ContextBar } from "./ContextBar.js";
import { InspectorDrawer } from "./InspectorDrawer.js";
import { LeftPanel } from "./LeftPanel.js";
import { PageStrip, formatPageToolbarLabel } from "./PageStrip.js";
import { RightRail } from "./RightRail.js";
import { SafeZoneOverlay } from "./SafeZoneOverlay.js";
import { Toolbar, type SaveStatus } from "./Toolbar.js";
import { useStagePointer } from "./useStagePointer.js";
import type { EditorApi } from "./useEditor.js";
import "./editor.css";

const INSPECTOR_KEY = "genposter.editor.inspectorOpen";

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

export function EditorTab({
  ed,
  set,
  pageIndex,
  saveStatus,
  onBack,
  onRetrySave,
  onRenameSet,
  onNameBlur,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onReorderPages,
  onRenamePage,
  onResizeCanvas,
}: {
  ed: EditorApi;
  set: TemplateSet | null;
  pageIndex: number;
  saveStatus: SaveStatus;
  onBack: () => void;
  onRetrySave: () => void;
  onRenameSet: (name: string) => void;
  onNameBlur: () => void;
  onSelectPage: (i: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (i: number) => void;
  onDeletePage: (i: number) => void;
  onReorderPages: (from: number, to: number) => void;
  onRenamePage: (i: number, name: string) => void;
  onResizeCanvas?: (w: number, h: number, mode: "scaleContent" | "clipOnly") => void;
}) {
  const stageViewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [inspectorOpen, setInspectorOpen] = useState(() => readFlag(INSPECTOR_KEY));

  useEffect(() => {
    try {
      localStorage.setItem(INSPECTOR_KEY, String(inspectorOpen));
    } catch {
      /* ignore */
    }
  }, [inspectorOpen]);

  useStagePointer(stageRef, ed, false);

  useEffect(() => {
    const viewport = stageViewportRef.current;
    if (!viewport || !ed.ready) return;
    const fit = () => {
      const cw = viewport.clientWidth - 48;
      const ch = viewport.clientHeight - 48;
      if (cw < 80 || ch < 80) return;
      ed.fitTo(cw, ch);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [ed.ready, set?.width, set?.height, inspectorOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const pages = set?.pages ?? [];
  const aspect = set ? set.width / set.height : 0.7;
  const pageLabel = set ? formatPageToolbarLabel(pages, pageIndex) : "";

  return (
    <div className="editor">
      <Toolbar
        ed={ed}
        name={set?.name ?? ""}
        onName={onRenameSet}
        onNameBlur={onNameBlur}
        onBack={onBack}
        saveStatus={saveStatus}
        onRetrySave={onRetrySave}
        pageLabel={pageLabel}
        canvasWidth={set?.width}
        canvasHeight={set?.height}
        onResizeCanvas={onResizeCanvas}
      />
      <div className={`editor-body${inspectorOpen ? " inspector-open" : ""}`}>
        <LeftPanel ed={ed} />
        <div className="stage-column">
          <ContextBar ed={ed} />
          <div className="stage-viewport" ref={stageViewportRef}>
            <div className="stage" ref={stageRef}>
              <CanvasContextMenu ed={ed} />
              <div
                className="stage-wrap"
                tabIndex={-1}
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  e.currentTarget.focus({ preventScroll: true });
                }}
              >
                <canvas ref={ed.canvasElRef} />
                <SafeZoneOverlay ed={ed} />
              </div>
            </div>
          </div>
        </div>
        {inspectorOpen && (
          <InspectorDrawer ed={ed} onClose={() => setInspectorOpen(false)} />
        )}
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
        onRename={onRenamePage}
      />
    </div>
  );
}
