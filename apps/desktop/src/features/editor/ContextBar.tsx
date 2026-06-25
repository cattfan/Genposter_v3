import * as fabric from "fabric";

import { isTextType } from "../../lib/fabric-util.js";
import { TextContextBar } from "./TextContextBar.js";
import type { EditorApi } from "./useEditor.js";

export function ContextBar({ ed }: { ed: EditorApi }) {
  void ed.tick;
  const obj = ed.getActive();
  const isText = obj && isTextType(obj);

  return (
    <div className="context-bar-strip">
      {isText && <TextContextBar ed={ed} text={obj as fabric.Textbox} />}
    </div>
  );
}
