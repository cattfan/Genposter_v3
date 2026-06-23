import { useEffect, useRef, useState } from "react";

import type { Job, Slide, SlidePayload } from "@genposter/template-schema";

import { api, type RecipeInfo } from "../../api.js";

type Phase = "idle" | "building" | "built" | "rendering" | "done" | "error";

export function ProduceTab() {
  const [recipes, setRecipes] = useState<RecipeInfo[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [payload, setPayload] = useState<SlidePayload | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [job, setJob] = useState<Job | null>(null);
  const [err, setErr] = useState<string>("");
  const [renderUp, setRenderUp] = useState<boolean>(true);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    Promise.all([
      api.recipes().then(setRecipes),
      api.renderHealth().then(() => setRenderUp(true)).catch(() => setRenderUp(false)),
      api.health().catch(() => {
        setErr("Data API chưa chạy (cổng 8756). Chạy pnpm dev hoặc pnpm sidecars trước.");
      }),
    ]).catch((e) => setErr(String(e)));
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  async function build() {
    if (!selected) return;
    setErr("");
    setPhase("building");
    setPayload(null);
    setJob(null);
    try {
      const p = await api.buildFromFile(selected);
      setPayload(p);
      setPhase("built");
    } catch (e) {
      setErr(String(e));
      setPhase("error");
    }
  }

  async function generate() {
    if (!payload) return;
    setErr("");
    setPhase("rendering");
    try {
      const { id } = await api.render(payload);
      timer.current = window.setInterval(async () => {
        try {
          const j = await api.job(id);
          setJob(j);
          if (j.status === "done" || j.status === "error") {
            if (timer.current) window.clearInterval(timer.current);
            setPhase(j.status === "done" ? "done" : "error");
            if (j.status === "error") setErr(j.error ?? "render error");
          }
        } catch (e) {
          if (timer.current) window.clearInterval(timer.current);
          setErr(String(e));
          setPhase("error");
        }
      }, 700);
    } catch (e) {
      setErr(String(e));
      setPhase("error");
    }
  }

  async function openOutput() {
    if (!job?.outputDir) return;
    try {
      const shell = await import("@tauri-apps/plugin-shell");
      await shell.open(job.outputDir);
    } catch {
      /* not running inside Tauri */
    }
  }

  const firstSlide: Slide | undefined = payload?.slides[0];
  const progress = job && job.total ? Math.round((job.done / job.total) * 100) : 0;

  return (
    <div>
      <h1 className="page-title">Sản xuất</h1>
      <p className="page-sub">Chọn recipe, dựng slide và xuất hàng loạt ảnh.</p>

      {err && <div className="banner err" style={{ marginBottom: 16 }}>{err}</div>}
      {!renderUp && (
        <div className="banner warn" style={{ marginBottom: 16 }}>
          Render service chưa chạy (cổng 8777). Chạy <code>pnpm render:serve</code> để xuất ảnh.
        </div>
      )}

      <div className="grid cols-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Recipe</h3>
          <div className="grid" style={{ gap: 10 }}>
            {recipes.length === 0 && <div className="muted">Chưa có recipe nào trong /recipes.</div>}
            {recipes.map((r) => (
              <div
                key={r.file}
                className={`recipe ${selected === r.file ? "active" : ""}`}
                onClick={() => setSelected(r.file)}
              >
                <div>
                  <div className="name">{r.name ?? r.file}</div>
                  <div className="meta">
                    {r.sheet} · {r.template_id}
                  </div>
                </div>
                {selected === r.file && <span className="badge">đã chọn</span>}
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn primary" disabled={!selected || phase === "building"} onClick={build}>
              {phase === "building" ? "Đang dựng..." : "Dựng slide"}
            </button>
            <button
              className="btn"
              disabled={!payload || phase === "rendering"}
              onClick={generate}
            >
              {phase === "rendering" ? "Đang xuất..." : "Xuất hàng loạt"}
            </button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Xem trước</h3>
          {!payload && <div className="muted">Bấm "Dựng slide" để xem dữ liệu.</div>}
          {payload && (
            <>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="badge">{payload.count} mục</span>
                <span className="badge">{payload.slides.length} slide</span>
              </div>
              {firstSlide && (
                <div style={{ marginTop: 14 }}>
                  <strong>{firstSlide.title}</strong>
                  <ol style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: 13 }}>
                    {firstSlide.items.slice(0, 7).map((it, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        <strong>{String(it.name ?? "")}</strong>{" "}
                        <span className="muted">
                          {String(it.address ?? "")} · {String(it.price ?? "")}
                        </span>
                      </li>
                    ))}
                  </ol>
                  {firstSlide.photos.length > 0 && (
                    <div className="grid cols-3" style={{ marginTop: 12 }}>
                      {firstSlide.photos.slice(0, 3).map((p, i) => (
                        <img key={i} className="thumb" src={api.fileUrl(p)} alt="" />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {(phase === "rendering" || phase === "done") && job && (
            <div style={{ marginTop: 18 }}>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                <span className="muted">
                  {job.done}/{job.total} ảnh
                </span>
                <span className="muted">{job.status}</span>
              </div>
              <div className="progress">
                <span style={{ width: `${progress}%` }} />
              </div>
              {phase === "done" && (
                <button className="btn" style={{ marginTop: 14 }} onClick={openOutput}>
                  Mở thư mục kết quả
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
