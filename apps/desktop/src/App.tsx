import { useState } from "react";

import logo from "./assets/logo.png";
import { DataTab } from "./features/data/DataTab.js";
import { EditorTab } from "./features/editor/EditorTab.js";
import { JobsTab } from "./features/jobs/JobsTab.js";
import { ProduceTab } from "./features/produce/ProduceTab.js";

type TabId = "produce" | "data" | "editor" | "jobs";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "produce", label: "Sản xuất", icon: "▶" },
  { id: "data", label: "Dữ liệu", icon: "▦" },
  { id: "editor", label: "Thiết kế", icon: "✎" },
  { id: "jobs", label: "Lịch sử", icon: "☰" },
];

export function App() {
  const [tab, setTab] = useState<TabId>("produce");

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img src={logo} alt="Riviu" />
        </div>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`nav-item ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span className="ico">{t.icon}</span>
            {t.label}
          </button>
        ))}
        <div className="spacer" />
        <div className="foot">Genposter V3 · content factory</div>
      </aside>

      <main className="main">
        {tab === "produce" && <ProduceTab />}
        {tab === "data" && <DataTab />}
        {tab === "editor" && <EditorTab />}
        {tab === "jobs" && <JobsTab />}
      </main>
    </div>
  );
}
