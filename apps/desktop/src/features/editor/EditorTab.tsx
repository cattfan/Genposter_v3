import { useEffect, useRef, useState } from "react";
import type { TemplateSet } from "@genposter/schema";

import { LeftPanel } from "./LeftPanel.js";
import { PageStrip } from "./PageStrip.js";
import { PropertiesPanel } from "./PropertiesPanel.js";
import { RightRail } from "./RightRail.js";
import { Toolbar } from "./Toolbar.js";
import type { EditorApi } from "./useEditor.js";
import "./editor.css";

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
  const [inspectorOpen, setInspectorOpen] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !ed.ready) return;
    const fit = () => ed.fitTo(stage.clientWidth - 48, stage.clientHeight - 48);
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
          <div className="stage" ref={stageRef}>
            <div className="stage-wrap">
              <canvas ref={ed.canvasElRef} />
            </div>
          </div>
          {inspectorOpen && <PropertiesPanel ed={ed} />}
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
