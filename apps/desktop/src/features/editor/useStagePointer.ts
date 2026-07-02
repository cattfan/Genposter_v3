import { useEffect, type RefObject } from "react";

import type { EditorApi } from "./useEditor.js";

/** Forward clicks/drags from gray stage padding to Fabric canvas (marquee / deselect). */
export function useStagePointer(stageRef: RefObject<HTMLDivElement | null>, ed: EditorApi) {
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = ed.getCanvas();
    if (!stage || !canvas || !ed.ready) return;

    const upper = canvas.upperCanvasEl;

    const onMouseDown = (e: MouseEvent) => {
      if (e.target !== stage || e.button !== 0) return;
      upper.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          clientX: e.clientX,
          clientY: e.clientY,
          button: e.button,
          buttons: e.buttons,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
        }),
      );
    };

    // Ctrl/Cmd + wheel zoom anywhere over the stage, including the gray
    // padding area outside the canvas (not just directly over it).
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      ed.zoomAtClientPoint(e.clientX, e.clientY, e.deltaY);
    };

    stage.addEventListener("mousedown", onMouseDown);
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      stage.removeEventListener("mousedown", onMouseDown);
      stage.removeEventListener("wheel", onWheel);
    };
  }, [ed, ed.ready, stageRef]);
}
