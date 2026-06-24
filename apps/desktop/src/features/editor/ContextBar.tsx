import * as fabric from "fabric";
import { Paper } from "@mantine/core";

import { isTextType } from "../../lib/fabric-util.js";
import { TextContextBar } from "./TextContextBar.js";
import type { EditorApi } from "./useEditor.js";

export function ContextBar({ ed }: { ed: EditorApi }) {
  void ed.tick;
  const obj = ed.getActive();
  const isText = obj && isTextType(obj);

  return (
    <div className="context-bar-strip">
      {isText && (
        <Paper className="context-bar" shadow="sm" radius="md" p={4} withBorder>
          <TextContextBar ed={ed} text={obj as fabric.Textbox} />
        </Paper>
      )}
    </div>
  );
}
