import { useEffect, useRef, useState } from "react";
import { Modal, NavLink, ScrollArea, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconFileText } from "@tabler/icons-react";
import { CANVAS_H, CANVAS_W, type GenposterTemplate } from "@genposter/schema";

import {
  listTemplates,
  loadTemplate,
  saveTemplate,
  type TemplateSummary,
} from "../../lib/template-io.js";
import { slugify } from "../../lib/paths.js";
import { LeftPanel } from "./LeftPanel.js";
import { PropertiesPanel } from "./PropertiesPanel.js";
import { Toolbar } from "./Toolbar.js";
import { useEditor } from "./useEditor.js";
import "./editor.css";

export function EditorTab() {
  const ed = useEditor();
  const stageRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("Mẫu mới");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);

  // Fit canvas to the stage on mount / resize.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !ed.ready) return;
    const fit = () => ed.fitTo(stage.clientWidth - 48, stage.clientHeight - 48);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [ed.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  function ok(message: string) {
    notifications.show({ message, color: "teal" });
  }
  function fail(message: string) {
    notifications.show({ message, color: "red" });
  }

  async function onSave() {
    setSaving(true);
    try {
      const tpl: GenposterTemplate = {
        id: currentId ?? slugify(name),
        name,
        width: CANVAS_W,
        height: CANVAS_H,
        scene: ed.exportScene(),
      };
      const id = await saveTemplate(tpl);
      setCurrentId(id);
      ok(`Đã lưu mẫu: ${id}`);
    } catch (e) {
      fail(`Lỗi lưu: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  async function onOpen() {
    try {
      setTemplates(await listTemplates());
      setShowOpen(true);
    } catch (e) {
      fail(`Không đọc được templates: ${String(e)}`);
    }
  }

  async function openTemplate(id: string) {
    try {
      const tpl = await loadTemplate(id);
      await ed.loadScene(tpl.scene);
      setName(tpl.name);
      setCurrentId(tpl.id);
      setShowOpen(false);
      ok(`Đã mở: ${tpl.name}`);
    } catch (e) {
      fail(`Lỗi mở mẫu: ${String(e)}`);
    }
  }

  function onNew() {
    ed.newDesign();
    setName("Mẫu mới");
    setCurrentId(null);
  }

  return (
    <div className="editor">
      <Toolbar
        ed={ed}
        name={name}
        onName={setName}
        onNew={onNew}
        onOpen={onOpen}
        onSave={onSave}
        saving={saving}
      />
      <div className="editor-body">
        <LeftPanel ed={ed} />
        <div className="stage" ref={stageRef}>
          <div className="stage-wrap">
            <canvas ref={ed.canvasElRef} />
          </div>
        </div>
        <PropertiesPanel ed={ed} />
      </div>

      <Modal
        opened={showOpen}
        onClose={() => setShowOpen(false)}
        title="Mở mẫu"
        size="md"
        centered
      >
        {templates.length === 0 ? (
          <Text c="dimmed" size="sm">
            Chưa có mẫu nào trong thư mục templates/.
          </Text>
        ) : (
          <ScrollArea.Autosize mah={420}>
            <Stack gap={4}>
              {templates.map((t) => (
                <NavLink
                  key={t.id}
                  label={t.name}
                  description={t.id}
                  leftSection={<IconFileText size={18} />}
                  onClick={() => openTemplate(t.id)}
                />
              ))}
            </Stack>
          </ScrollArea.Autosize>
        )}
      </Modal>
    </div>
  );
}
