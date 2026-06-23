import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { GenposterTemplate, Layer, TextLayer } from "@genposter/template-schema";
import { colors } from "@genposter/theme";

import { api } from "../../api.js";

const W = 1080;
const H = 1350;

const MOCK_SLIDE = {
  index: 1,
  page: 1,
  pages: 1,
  title: "TO DO LIST - ĂN TỐI",
  subtitle: "",
  items: [
    {
      name: "Cháo Hào Hoàng Hà",
      address: "84 Nguyễn Thị Nghĩa",
      price: "~35k - 95k",
      photos: [] as string[],
    },
    {
      name: "Yummy Noodle",
      address: "19/10 Đào Duy Từ",
      price: "~40k - 75k",
      photos: [] as string[],
    },
  ],
  photos: [] as string[],
};

function bindPreview(text: string, ctx: Record<string, unknown>): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const parts = key.split(".");
    let v: unknown = ctx;
    for (const p of parts) {
      if (v == null || typeof v !== "object") return "";
      v = (v as Record<string, unknown>)[p];
    }
    return v == null ? "" : String(v);
  });
}

function newTextLayer(y: number): TextLayer {
  return {
    type: "text",
    x: 80,
    y,
    width: 400,
    height: 48,
    text: "{{title}}",
    fontSize: 32,
    fontFamily: "Be Vietnam Pro",
    fontWeight: 700,
    fill: colors.orange,
    align: "left",
  };
}

export function TemplateBuilder() {
  const [templates, setTemplates] = useState<{ id: string; name?: string }[]>([]);
  const [templateId, setTemplateId] = useState("to_do_list_an_toi_v1");
  const [tpl, setTpl] = useState<GenposterTemplate | null>(null);
  const [selected, setSelected] = useState<number>(-1);
  const [scale, setScale] = useState(0.45);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [previewPath, setPreviewPath] = useState("");
  const drag = useRef<{ idx: number; ox: number; oy: number; lx: number; ly: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    try {
      const list = await api.templates();
      setTemplates(list);
      setErr("");
    } catch (e) {
      setErr(String(e));
    }
  }, []);

  const loadTemplate = useCallback(async (id: string) => {
    try {
      const t = (await api.getTemplate(id)) as GenposterTemplate;
      setTpl(t);
      setTemplateId(t.id ?? id);
      setSelected(-1);
      setErr("");
    } catch (e) {
      setErr(String(e));
    }
  }, []);

  useEffect(() => {
    loadList();
    loadTemplate("to_do_list_an_toi_v1");
  }, [loadList, loadTemplate]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth - 40;
      setScale(Math.min(0.55, Math.max(0.25, w / W)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ctx = useMemo(
    () => ({
      ...MOCK_SLIDE,
      slide: MOCK_SLIDE,
      title: MOCK_SLIDE.title,
      page: MOCK_SLIDE.page,
      pages: MOCK_SLIDE.pages,
    }),
    [],
  );

  async function save() {
    if (!tpl) return;
    setMsg("");
    try {
      await api.saveTemplate(templateId, tpl as unknown as Record<string, unknown>);
      setMsg("Đã lưu mẫu.");
      loadList();
    } catch (e) {
      setErr(String(e));
    }
  }

  async function renderPreview() {
    if (!tpl) return;
    setMsg("Đang render xem trước…");
    try {
      const payload = {
        recipe: "preview",
        templateId: tpl.id,
        output: { format: "jpg", quality: 85 },
        slides: [MOCK_SLIDE],
      };
      const { id } = await api.render(payload);
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const job = await api.job(id);
        if (job.status === "done" && job.items[0]) {
          setPreviewPath(job.items[0].file);
          setMsg("");
          return;
        }
        if (job.status === "error") throw new Error(job.error ?? "render failed");
      }
      throw new Error("timeout");
    } catch (e) {
      setErr(String(e));
      setMsg("");
    }
  }

  function updateLayer(idx: number, patch: Partial<Layer>) {
    if (!tpl) return;
    const layers = [...tpl.layers];
    layers[idx] = { ...layers[idx], ...patch } as Layer;
    setTpl({ ...tpl, layers });
  }

  function addTextLayer() {
    if (!tpl) return;
    const y = tpl.layers.length ? tpl.layers[tpl.layers.length - 1]!.y + 60 : 100;
    setTpl({ ...tpl, layers: [...tpl.layers, newTextLayer(y)] });
    setSelected(tpl.layers.length);
  }

  function removeLayer() {
    if (!tpl || selected < 0) return;
    setTpl({ ...tpl, layers: tpl.layers.filter((_, i) => i !== selected) });
    setSelected(-1);
  }

  function onPointerDown(e: React.PointerEvent, idx: number) {
    if (!tpl) return;
    const layer = tpl.layers[idx]!;
    if (layer.type !== "text" && layer.type !== "rect" && layer.type !== "image") return;
    drag.current = { idx, ox: e.clientX, oy: e.clientY, lx: layer.x, ly: layer.y };
    setSelected(idx);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !tpl) return;
    const d = drag.current;
    const dx = (e.clientX - d.ox) / scale;
    const dy = (e.clientY - d.oy) / scale;
    updateLayer(d.idx, { x: Math.round(d.lx + dx), y: Math.round(d.ly + dy) });
  }

  function onPointerUp() {
    drag.current = null;
  }

  const sel = selected >= 0 && tpl ? tpl.layers[selected] : null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 280px", height: "100%" }}>
      {/* Layers */}
      <aside style={{ borderRight: "1px solid var(--rv-border)", padding: 12, overflow: "auto" }}>
        <label className="muted" style={{ fontSize: 12 }}>
          Mẫu
        </label>
        <select
          className="btn"
          style={{ width: "100%", marginBottom: 12 }}
          value={templateId}
          onChange={(e) => {
            setTemplateId(e.target.value);
            loadTemplate(e.target.value);
          }}
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name ?? t.id}
            </option>
          ))}
        </select>
        <div className="row" style={{ marginBottom: 12, flexWrap: "wrap" }}>
          <button className="btn primary" type="button" onClick={save}>
            Lưu
          </button>
          <button className="btn" type="button" onClick={renderPreview}>
            Xem trước
          </button>
        </div>
        {msg && <div className="banner warn" style={{ marginBottom: 8, fontSize: 12 }}>{msg}</div>}
        {err && <div className="banner err" style={{ marginBottom: 8, fontSize: 12 }}>{err}</div>}

        <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
          <strong style={{ fontSize: 13 }}>Layers</strong>
          <button className="btn" type="button" style={{ padding: "4px 10px" }} onClick={addTextLayer}>
            + Text
          </button>
        </div>
        {tpl?.layers.map((l, i) => (
          <div
            key={i}
            className={`recipe ${selected === i ? "active" : ""}`}
            style={{ padding: "8px 10px", marginBottom: 6 }}
            onClick={() => setSelected(i)}
          >
            <div className="name" style={{ fontSize: 13 }}>
              {i + 1}. {l.type}
            </div>
            <div className="meta">
              {l.type === "text" ? (l as TextLayer).text.slice(0, 24) : `${l.x}, ${l.y}`}
            </div>
          </div>
        ))}
        {selected >= 0 && (
          <button className="btn" type="button" style={{ marginTop: 8, color: "var(--rv-danger)" }} onClick={removeLayer}>
            Xóa layer
          </button>
        )}
      </aside>

      {/* Canvas */}
      <div
        ref={wrapRef}
        style={{
          overflow: "auto",
          background: "#e8e4e0",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: 20,
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          style={{
            width: W * scale,
            height: H * scale,
            position: "relative",
            boxShadow: "var(--rv-shadow-md)",
            background: tpl?.background ?? "#fff",
            flexShrink: 0,
          }}
        >
          {tpl?.layers.map((layer, i) => {
            if (layer.type === "rect") {
              return (
                <div
                  key={i}
                  onPointerDown={(e) => onPointerDown(e, i)}
                  style={{
                    position: "absolute",
                    left: layer.x * scale,
                    top: layer.y * scale,
                    width: layer.width * scale,
                    height: (layer.height ?? 20) * scale,
                    background: layer.fill,
                    borderRadius: (layer.radius ?? 0) * scale,
                    outline: selected === i ? `2px solid ${colors.orange}` : undefined,
                    cursor: "move",
                  }}
                />
              );
            }
            if (layer.type === "text") {
              const t = layer as TextLayer;
              const text = bindPreview(t.text, ctx);
              return (
                <div
                  key={i}
                  onPointerDown={(e) => onPointerDown(e, i)}
                  style={{
                    position: "absolute",
                    left: t.x * scale,
                    top: t.y * scale,
                    width: t.width * scale,
                    fontSize: t.fontSize * scale,
                    fontWeight: t.fontWeight ?? 400,
                    color: t.fill ?? colors.ink,
                    textAlign: t.align ?? "left",
                    outline: selected === i ? `2px solid ${colors.orange}` : undefined,
                    cursor: "move",
                    lineHeight: 1.2,
                    overflow: "hidden",
                  }}
                >
                  {text}
                </div>
              );
            }
            if (layer.type === "list") {
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: layer.x * scale,
                    top: layer.y * scale,
                    width: layer.width * scale,
                    height: (layer.rowHeight * (layer.maxRows ?? 3) + (layer.gap ?? 0) * 2) * scale,
                    border: `1px dashed ${colors.orange}`,
                    background: "rgba(255,102,0,0.05)",
                    fontSize: 11 * scale,
                    color: colors.muted,
                    padding: 4,
                  }}
                  onClick={() => setSelected(i)}
                >
                  list · {layer.maxRows ?? "?"} rows
                </div>
              );
            }
            if (layer.type === "gallery") {
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: layer.x * scale,
                    top: layer.y * scale,
                    width: layer.width * scale,
                    height: layer.height * scale,
                    border: `1px dashed ${colors.orangeLight}`,
                    background: "rgba(255,102,0,0.08)",
                    fontSize: 11 * scale,
                    color: colors.muted,
                    padding: 4,
                  }}
                  onClick={() => setSelected(i)}
                >
                  gallery · {layer.columns} cols
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Properties + render preview */}
      <aside style={{ borderLeft: "1px solid var(--rv-border)", padding: 12, overflow: "auto" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Thuộc tính</h3>
        {!sel && <p className="muted">Chọn một layer trên canvas.</p>}

        {sel && (sel.type === "text" || sel.type === "rect" || sel.type === "image") && (
          <div className="grid" style={{ gap: 10 }}>
            {(["x", "y", "width"] as const).map((k) => (
              <label key={k} style={{ fontSize: 12 }}>
                {k}
                <input
                  type="number"
                  className="btn"
                  style={{ width: "100%", marginTop: 4 }}
                  value={(sel as { x: number; y: number; width: number })[k]}
                  onChange={(e) => updateLayer(selected, { [k]: Number(e.target.value) })}
                />
              </label>
            ))}
            {sel.type === "text" && (
              <>
                <label style={{ fontSize: 12 }}>
                  Nội dung
                  <input
                    className="btn"
                    style={{ width: "100%", marginTop: 4 }}
                    value={(sel as TextLayer).text}
                    onChange={(e) => updateLayer(selected, { text: e.target.value })}
                  />
                </label>
                <label style={{ fontSize: 12 }}>
                  fontSize
                  <input
                    type="number"
                    className="btn"
                    style={{ width: "100%", marginTop: 4 }}
                    value={(sel as TextLayer).fontSize}
                    onChange={(e) => updateLayer(selected, { fontSize: Number(e.target.value) })}
                  />
                </label>
                <label style={{ fontSize: 12 }}>
                  Màu
                  <input
                    type="color"
                    style={{ width: "100%", marginTop: 4, height: 36 }}
                    value={(sel as TextLayer).fill ?? colors.orange}
                    onChange={(e) => updateLayer(selected, { fill: e.target.value })}
                  />
                </label>
              </>
            )}
            {sel.type === "rect" && (
              <label style={{ fontSize: 12 }}>
                Màu nền
                <input
                  type="color"
                  style={{ width: "100%", marginTop: 4, height: 36 }}
                  value={sel.fill ?? colors.orange}
                  onChange={(e) => updateLayer(selected, { fill: e.target.value })}
                />
              </label>
            )}
          </div>
        )}

        {previewPath && (
          <div style={{ marginTop: 20 }}>
            <strong style={{ fontSize: 13 }}>Ảnh render</strong>
            <img
              src={api.fileUrl(previewPath)}
              alt="preview"
              style={{ width: "100%", marginTop: 8, borderRadius: 8, border: "1px solid var(--rv-border)" }}
            />
          </div>
        )}

        <div style={{ marginTop: 20, fontSize: 11, color: "var(--rv-muted)", lineHeight: 1.5 }}>
          Token: <code>{"{{title}}"}</code>, <code>{"{{item.name}}"}</code>,{" "}
          <code>{"{{page}}/{{pages}}"}</code>
        </div>
      </aside>
    </div>
  );
}
