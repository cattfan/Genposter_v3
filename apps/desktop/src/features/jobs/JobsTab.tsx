import { useEffect, useState } from "react";

import type { Job } from "@genposter/template-schema";

import { api } from "../../api.js";

export function JobsTab() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [err, setErr] = useState<string>("");

  async function refresh() {
    try {
      setJobs(await api.jobs());
      setErr("");
    } catch (e) {
      setErr(String(e));
    }
  }

  useEffect(() => {
    refresh();
    const t = window.setInterval(refresh, 2000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div>
      <h1 className="page-title">Lịch sử</h1>
      <p className="page-sub">Các lần xuất ảnh gần đây (render service).</p>

      {err && (
        <div className="banner warn" style={{ marginBottom: 16 }}>
          Không kết nối được render service (8777). {err}
        </div>
      )}

      <div className="card">
        <table className="data">
          <thead>
            <tr>
              <th>Recipe</th>
              <th>Template</th>
              <th>Trạng thái</th>
              <th>Tiến độ</th>
              <th>Thư mục</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Chưa có job nào.
                </td>
              </tr>
            )}
            {jobs.map((j) => (
              <tr key={j.id}>
                <td>{j.recipe || "—"}</td>
                <td>{j.templateId}</td>
                <td>
                  <span className="badge">{j.status}</span>
                </td>
                <td>
                  {j.done}/{j.total}
                </td>
                <td className="muted">{j.outputDir}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
