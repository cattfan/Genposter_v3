import { lazy, Suspense, useState } from "react";

import { TemplateBuilder } from "./TemplateBuilder.js";

const PolotnoEditor = lazy(() =>
  import("./PolotnoEditor.js").then((m) => ({ default: m.PolotnoEditor })),
);

type Mode = "builder" | "polotno";

export function EditorTab() {
  const [mode, setMode] = useState<Mode>("builder");
  const hasPolotnoKey = Boolean(import.meta.env.VITE_POLOTNO_KEY);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 0px)", margin: "-28px -32px" }}>
      <div
        className="row"
        style={{
          padding: "10px 20px",
          borderBottom: "1px solid var(--rv-border)",
          background: "var(--rv-surface)",
          gap: 8,
        }}
      >
        <button
          className={`btn ${mode === "builder" ? "primary" : ""}`}
          onClick={() => setMode("builder")}
        >
          Trình tạo mẫu
        </button>
        <button
          className={`btn ${mode === "polotno" ? "primary" : ""}`}
          onClick={() => setMode("polotno")}
          title={hasPolotnoKey ? "Polotno Pro" : "Cần VITE_POLOTNO_KEY trong .env"}
        >
          Polotno (kéo thả)
        </button>
        <span className="muted" style={{ marginLeft: "auto", fontSize: 12 }}>
          1080×1350 · lưu vào <code>templates/</code>
        </span>
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {mode === "builder" && <TemplateBuilder />}
        {mode === "polotno" && (
          <Suspense fallback={<div className="muted" style={{ padding: 24 }}>Đang tải Polotno…</div>}>
            <PolotnoEditor />
          </Suspense>
        )}
      </div>
    </div>
  );
}
