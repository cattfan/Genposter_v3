import { useEffect, useState } from "react";

import { api, type SheetInfo } from "../../api.js";

const PREVIEW_FIELDS = ["name", "address", "price", "price_pp", "desc"] as const;

export function DataTab() {
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [active, setActive] = useState<string>("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.sheets().then(setSheets).catch((e) => setErr(String(e)));
  }, []);

  async function openSheet(sheet: string) {
    setActive(sheet);
    setLoading(true);
    setErr("");
    try {
      const res = await api.sheetRows(sheet, 50);
      setRows(res.rows);
    } catch (e) {
      setErr(String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Dữ liệu</h1>
      <p className="page-sub">Excel F&amp;B Đà Lạt — 10 sheet, ánh xạ qua data/mapping.yaml.</p>

      {err && <div className="banner err" style={{ marginBottom: 16 }}>{err}</div>}

      <div className="grid cols-3" style={{ marginBottom: 20 }}>
        {sheets.map((s) => (
          <div
            key={s.sheet}
            className={`recipe ${active === s.sheet ? "active" : ""}`}
            onClick={() => openSheet(s.sheet)}
          >
            <div>
              <div className="name">{s.label}</div>
              <div className="meta">
                {typeof s.rows === "number" ? `${s.rows} dòng` : "—"}
                {s.photos ? ` · ${s.photos}` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>

      {active && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{active}</h3>
          {loading ? (
            <div className="muted">Đang tải…</div>
          ) : (
            <div style={{ maxHeight: 460, overflow: "auto" }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>#</th>
                    {PREVIEW_FIELDS.map((f) => (
                      <th key={f}>{f}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      {PREVIEW_FIELDS.map((f) => (
                        <td key={f}>{truncate(String(r[f] ?? ""))}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function truncate(s: string, n = 90): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
