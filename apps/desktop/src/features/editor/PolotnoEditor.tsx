import { useMemo, useState } from "react";

import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from "polotno";
import { Workspace } from "polotno/canvas/workspace";
import { createStore } from "polotno/model/store";
import { SidePanel } from "polotno/side-panel";
import { Toolbar } from "polotno/toolbar/toolbar";
import { ZoomButtons } from "polotno/toolbar/zoom-buttons";

import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";

import { api } from "../../api.js";

const KEY = (import.meta.env.VITE_POLOTNO_KEY as string) ?? "";

export function PolotnoEditor() {
  const [msg, setMsg] = useState("");
  const [templateId, setTemplateId] = useState("custom_polotno_v1");

  const store = useMemo(() => {
    const s = createStore({ key: KEY, showCredit: !KEY });
    s.setSize(1080, 1350);
    if (s.pages.length === 0) s.addPage();
    return s;
  }, []);

  async function saveTemplate() {
    setMsg("Đang lưu…");
    try {
      const scene = store.toJSON();
      await api.saveTemplate(templateId, {
        id: templateId,
        name: "Polotno design",
        archetype: "polotno",
        width: 1080,
        height: 1350,
        background: "#faf8f6",
        polotnoScene: scene,
        layers: [],
      });
      setMsg("Đã lưu (kèm polotnoScene).");
    } catch (e) {
      setMsg(String(e));
    }
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="row" style={{ padding: "8px 12px", gap: 8, background: "var(--rv-surface)", borderBottom: "1px solid var(--rv-border)" }}>
        <input
          className="btn"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          placeholder="template_id"
          style={{ width: 200 }}
        />
        <button className="btn primary" type="button" onClick={saveTemplate}>
          Lưu mẫu Polotno
        </button>
        {msg && <span className="muted" style={{ fontSize: 12 }}>{msg}</span>}
        {!KEY && (
          <span className="badge">Demo mode — thêm VITE_POLOTNO_KEY để bỏ watermark</span>
        )}
      </div>
      <PolotnoContainer style={{ flex: 1, width: "100%" }}>
        <SidePanelWrap>
          <SidePanel store={store} />
        </SidePanelWrap>
        <WorkspaceWrap>
          <Toolbar store={store} downloadButtonEnabled />
          <Workspace store={store} />
          <ZoomButtons store={store} />
        </WorkspaceWrap>
      </PolotnoContainer>
    </div>
  );
}
