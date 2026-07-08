import type { EditorApi } from "./useEditor.js";

/** TikTok-style unsafe zones (caption bar + right-side chrome). Editor-only overlay. */
export function SafeZoneOverlay({ ed }: { ed: EditorApi }) {
  void ed.tick;
  const pad = ed.getPasteboardPad();
  const pageW = ed.getCanvas()?.width
    ? (ed.getCanvas()!.width / ed.zoom - 2 * pad)
    : 0;
  const pageH = ed.getCanvas()?.height
    ? (ed.getCanvas()!.height / ed.zoom - 2 * pad)
    : 0;
  if (pageW <= 0 || pageH <= 0) return null;

  const canvasW = pageW + 2 * pad;
  const canvasH = pageH + 2 * pad;

  return (
    <div className="safe-zone-overlay" aria-hidden>
      <div
        className="safe-zone-page"
        style={{
          left: `${(pad / canvasW) * 100}%`,
          top: `${(pad / canvasH) * 100}%`,
          width: `${(pageW / canvasW) * 100}%`,
          height: `${(pageH / canvasH) * 100}%`,
        }}
      >
        <div className="safe-zone-region safe-zone-bottom" title="Vùng caption TikTok" />
        <div className="safe-zone-region safe-zone-right" title="Vùng nút TikTok" />
      </div>
    </div>
  );
}
