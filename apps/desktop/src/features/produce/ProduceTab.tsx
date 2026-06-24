import { useEffect, useState } from "react";
import { open as openPath } from "@tauri-apps/plugin-shell";
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  NumberInput,
  Progress,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconDeviceFloppy,
  IconDownload,
  IconFilePlus,
  IconFolderOpen,
  IconPlayerPlay,
} from "@tabler/icons-react";
import type { GenposterTemplate, SlidePayload } from "@genposter/schema";

import { buildSlides } from "../../lib/build.js";
import { sheetColumns, listSheets, type SheetInfo } from "../../lib/excel.js";
import { loadMapping } from "../../lib/mapping.js";
import { renderAll } from "../../lib/render.js";
import {
  listRecipes,
  loadRecipe,
  saveRecipe,
  type RecipeSummary,
} from "../../lib/recipe-io.js";
import {
  listTemplates,
  loadTemplate,
  type TemplateSummary,
} from "../../lib/template-io.js";
import { extractElements, type ElementInfo } from "./elements.js";
import { bindKind, buildBindOptions } from "./options.js";
import {
  draftToRecipe,
  emptyDraft,
  mergeElements,
  recipeToDraft,
  type Draft,
} from "./preset-utils.js";
import "./produce.css";

const ok = (message: string) => notifications.show({ message, color: "teal" });
const fail = (message: string) => notifications.show({ message, color: "red" });

export function ProduceTab() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [canonFields, setCanonFields] = useState<string[]>([]);

  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [elements, setElements] = useState<ElementInfo[]>([]);
  const [template, setTemplate] = useState<GenposterTemplate | null>(null);

  const [payload, setPayload] = useState<SlidePayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const [dataErr, setDataErr] = useState<string | null>(null);

  const setD = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => {
    void (async () => {
      try {
        setTemplates(await listTemplates());
        setRecipes(await listRecipes());
      } catch (e) {
        fail(`Không đọc được templates/recipes: ${String(e)}`);
      }
      try {
        setSheets(await listSheets());
        setDataErr(null);
      } catch (e) {
        setDataErr(
          `Không đọc được Excel. Hãy đặt file vào data/database/ và kiểm tra mapping.yaml. (${String(e)})`,
        );
      }
    })();
  }, []);

  async function chooseTemplate(id: string, base?: Draft) {
    if (!id) {
      setTemplate(null);
      setElements([]);
      return;
    }
    try {
      const tpl = await loadTemplate(id);
      const els = extractElements(tpl.scene);
      setTemplate(tpl);
      setElements(els);
      setDraft((d) => mergeElements({ ...(base ?? d), templateId: id }, els));
    } catch (e) {
      fail(`Lỗi tải mẫu: ${String(e)}`);
    }
  }

  async function chooseSheet(sheet: string) {
    setD({ sheet });
    if (!sheet) {
      setColumns([]);
      setCanonFields([]);
      return;
    }
    try {
      setColumns(await sheetColumns(sheet));
      const m = await loadMapping();
      setCanonFields(Object.keys(m.sheets[sheet]?.fields ?? {}));
    } catch (e) {
      fail(`Lỗi đọc cột sheet: ${String(e)}`);
    }
  }

  async function chooseRecipe(id: string) {
    if (!id) {
      setDraft(emptyDraft(draft.templateId));
      return;
    }
    try {
      const r = await loadRecipe(id);
      const d = recipeToDraft(r);
      await chooseTemplate(r.templateId, d);
      await chooseSheet(r.data.sheet);
      setDraft(d);
      ok(`Đã mở preset: ${r.name}`);
    } catch (e) {
      fail(`Lỗi mở preset: ${String(e)}`);
    }
  }

  async function savePreset() {
    try {
      const recipe = draftToRecipe(draft, elements);
      const id = await saveRecipe(recipe);
      setRecipes(await listRecipes());
      setD({ id });
      ok(`Đã lưu preset: ${id}`);
    } catch (e) {
      fail(`Lỗi lưu preset: ${String(e)}`);
    }
  }

  async function build() {
    setPayload(null);
    setBusy(true);
    try {
      const recipe = draftToRecipe(draft, elements);
      const p = await buildSlides(recipe);
      setPayload(p);
      ok(`Đã dựng ${p.slides.length} slide từ ${p.count} mục.`);
    } catch (e) {
      fail(`Lỗi dựng slide: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function exportAll() {
    if (!template || !payload) return;
    setBusy(true);
    setProgress({ done: 0, total: payload.slides.length });
    try {
      const recipe = draftToRecipe(draft, elements);
      const res = await renderAll(template, payload, recipe, {
        onProgress: (done, total) => setProgress({ done, total }),
      });
      setOutputDir(res.outputDir);
      ok(`Xuất xong ${res.files.length} ảnh.`);
    } catch (e) {
      fail(`Lỗi xuất ảnh: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const percent =
    progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  return (
    <div className="produce">
      <Group className="produce-head" gap="md" align="flex-end" wrap="wrap">
        <Box mr="auto">
          <Title order={3}>Tạo ảnh</Title>
          <Text c="dimmed" size="sm">
            Gán dữ liệu vào mẫu rồi xuất hàng loạt
          </Text>
        </Box>
        <Select
          label="Mẫu thiết kế"
          placeholder="— Chọn mẫu —"
          w={210}
          clearable
          value={draft.templateId || null}
          data={templates.map((t) => ({ value: t.id, label: t.name }))}
          onChange={(v) => void chooseTemplate(v ?? "")}
        />
        <Select
          label="Preset"
          placeholder="— Preset mới —"
          w={210}
          clearable
          value={draft.id || null}
          data={recipes.map((r) => ({ value: r.id, label: r.name }))}
          onChange={(v) => void chooseRecipe(v ?? "")}
        />
        <Button
          variant="default"
          leftSection={<IconFilePlus size={18} />}
          onClick={() => setDraft(emptyDraft(draft.templateId))}
        >
          Preset mới
        </Button>
        <Button
          leftSection={<IconDeviceFloppy size={18} />}
          onClick={() => void savePreset()}
        >
          Lưu preset
        </Button>
      </Group>

      {dataErr && (
        <Alert
          icon={<IconAlertTriangle size={18} />}
          color="red"
          title="Chưa đọc được dữ liệu"
          m="md"
        >
          {dataErr}
        </Alert>
      )}

      <div className="produce-body">
        <Card withBorder radius="lg" padding="lg">
          <Title order={5} mb="sm">
            Nguồn dữ liệu
          </Title>
          <Stack gap="sm">
            <TextInput
              label="Tên preset"
              value={draft.name}
              onChange={(e) => setD({ name: e.currentTarget.value })}
            />
            <SimpleGrid cols={2} spacing="sm">
              <Select
                label="Sheet"
                placeholder="— Chọn sheet —"
                value={draft.sheet || null}
                data={sheets.map((s) => ({
                  value: s.sheet,
                  label: `${s.label} (${s.rows})`,
                }))}
                onChange={(v) => void chooseSheet(v ?? "")}
              />
              <NumberInput
                label="Số mục / slide"
                min={1}
                value={draft.itemsPerSlide}
                onChange={(v) =>
                  setD({ itemsPerSlide: typeof v === "number" ? v : 1 })
                }
              />
              <Select
                label="Lọc theo cột"
                placeholder="— Không lọc —"
                clearable
                value={draft.filterField || null}
                data={columns}
                onChange={(v) => setD({ filterField: v ?? "" })}
              />
              <TextInput
                label="Giá trị lọc"
                placeholder="vd: An Toi"
                value={draft.filterValue}
                onChange={(e) => setD({ filterValue: e.currentTarget.value })}
              />
              <NumberInput
                label="Giới hạn mục (trống = tất cả)"
                min={0}
                value={draft.limit === "" ? "" : Number(draft.limit)}
                onChange={(v) =>
                  setD({ limit: v === "" || v == null ? "" : String(v) })
                }
              />
              <NumberInput
                label="Ảnh / mục"
                min={0}
                value={draft.perItem}
                onChange={(v) =>
                  setD({ perItem: typeof v === "number" ? v : 0 })
                }
              />
              <NumberInput
                label="Ảnh / slide"
                min={0}
                value={draft.perSlide}
                onChange={(v) =>
                  setD({ perSlide: typeof v === "number" ? v : 0 })
                }
              />
            </SimpleGrid>
            <SimpleGrid cols={2} spacing="sm">
              <TextInput
                label="Tiêu đề"
                value={draft.title}
                onChange={(e) => setD({ title: e.currentTarget.value })}
              />
              <TextInput
                label="Phụ đề"
                value={draft.subtitle}
                onChange={(e) => setD({ subtitle: e.currentTarget.value })}
              />
            </SimpleGrid>
          </Stack>
        </Card>

        <Card withBorder radius="lg" padding="lg">
          <Title order={5} mb="sm">
            Hàng danh sách & Xuất
          </Title>
          <Text c="dimmed" size="xs" mb="sm">
            Các đối tượng tick “hàng DS” sẽ được nhân theo số mục trong slide.
          </Text>
          <Stack gap="sm">
            <SimpleGrid cols={3} spacing="sm">
              <NumberInput
                label="Cao mỗi hàng (px)"
                value={draft.rowHeight}
                onChange={(v) =>
                  setD({ rowHeight: typeof v === "number" ? v : 0 })
                }
              />
              <NumberInput
                label="Khoảng cách (px)"
                value={draft.gap}
                onChange={(v) => setD({ gap: typeof v === "number" ? v : 0 })}
              />
              <NumberInput
                label="Số hàng tối đa"
                value={draft.maxRows}
                onChange={(v) =>
                  setD({ maxRows: typeof v === "number" ? v : 0 })
                }
              />
            </SimpleGrid>
            <SimpleGrid cols={3} spacing="sm">
              <TextInput
                label="Thư mục xuất"
                placeholder="output/..."
                value={draft.outDir}
                onChange={(e) => setD({ outDir: e.currentTarget.value })}
              />
              <Box>
                <Text size="sm" fw={500} mb={4}>
                  Định dạng
                </Text>
                <SegmentedControl
                  fullWidth
                  value={draft.format}
                  onChange={(v) => setD({ format: v as "jpg" | "png" })}
                  data={[
                    { value: "jpg", label: "JPG" },
                    { value: "png", label: "PNG" },
                  ]}
                />
              </Box>
              <NumberInput
                label="Chất lượng"
                min={10}
                max={100}
                value={draft.quality}
                onChange={(v) =>
                  setD({ quality: typeof v === "number" ? v : 90 })
                }
              />
            </SimpleGrid>
          </Stack>
        </Card>

        <Card withBorder radius="lg" padding="lg" className="full">
          <Title order={5} mb="sm">
            Gán dữ liệu cho đối tượng
          </Title>
          {elements.length === 0 ? (
            <Text c="dimmed" size="sm">
              Chọn một mẫu để hiển thị danh sách đối tượng.
            </Text>
          ) : (
            <Table striped highlightOnHover verticalSpacing="xs" layout="fixed">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w="26%">Đối tượng</Table.Th>
                  <Table.Th w="32%">Nguồn dữ liệu</Table.Th>
                  <Table.Th w="32%">Giá trị / prompt</Table.Th>
                  <Table.Th w="10%">Hàng DS</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {elements.map((el) => {
                  const bind = draft.bindings[el.id] ?? "";
                  const kind = bindKind(bind);
                  const selectVal =
                    kind === "static" ? "static:" : kind === "ai" ? "ai:" : bind;
                  const options = buildBindOptions(canonFields, el.isImage);
                  const inRow = draft.listRowIds.includes(el.id);
                  return (
                    <Table.Tr key={el.id}>
                      <Table.Td>
                        <Text size="sm" fw={600} truncate>
                          {el.label}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {el.type} · {el.id}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Select
                          size="xs"
                          allowDeselect={false}
                          comboboxProps={{ withinPortal: true }}
                          value={selectVal}
                          data={options}
                          onChange={(v) =>
                            setD({
                              bindings: {
                                ...draft.bindings,
                                [el.id]: v ?? "",
                              },
                            })
                          }
                        />
                      </Table.Td>
                      <Table.Td>
                        {kind !== "plain" ? (
                          <TextInput
                            size="xs"
                            value={bind.slice(kind === "static" ? 7 : 3)}
                            placeholder={
                              kind === "ai"
                                ? "Prompt dùng {{item.name}}…"
                                : "Văn bản…"
                            }
                            onChange={(e) =>
                              setD({
                                bindings: {
                                  ...draft.bindings,
                                  [el.id]:
                                    (kind === "static" ? "static:" : "ai:") +
                                    e.currentTarget.value,
                                },
                              })
                            }
                          />
                        ) : (
                          <Text c="dimmed" size="xs">
                            —
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td ta="center">
                        <Checkbox
                          checked={inRow}
                          onChange={(e) => {
                            const set = new Set(draft.listRowIds);
                            if (e.currentTarget.checked) set.add(el.id);
                            else set.delete(el.id);
                            setD({ listRowIds: [...set] });
                          }}
                        />
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}
        </Card>

        {payload && (
          <Card withBorder radius="lg" padding="lg" className="full">
            <Title order={5} mb="sm">
              Xem trước ({payload.slides.length} slide)
            </Title>
            <SimpleGrid
              cols={{ base: 2, sm: 3, md: 4, lg: 6 }}
              spacing="sm"
            >
              {payload.slides.slice(0, 12).map((s) => (
                <Card key={s.index} withBorder radius="md" padding="sm">
                  <Text size="sm" fw={700} mb={4}>
                    Slide {s.page}/{s.pages}
                  </Text>
                  <Stack gap={2}>
                    {s.items.slice(0, 5).map((it, i) => (
                      <Text key={i} size="xs" c="dimmed" truncate>
                        {String(it.name ?? it.desc ?? "—")}
                      </Text>
                    ))}
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          </Card>
        )}
      </div>

      <Group className="produce-actions" gap="md">
        <Button
          variant="default"
          leftSection={<IconPlayerPlay size={18} />}
          onClick={() => void build()}
          disabled={busy || !draft.sheet}
          loading={busy && progress.total === 0}
        >
          Dựng slide
        </Button>
        <Button
          leftSection={<IconDownload size={18} />}
          onClick={() => void exportAll()}
          disabled={busy || !payload || !template}
          loading={busy && progress.total > 0}
        >
          Xuất hàng loạt
        </Button>
        {progress.total > 0 && (
          <Box style={{ flex: 1 }}>
            <Progress value={percent} animated={busy} />
          </Box>
        )}
        {progress.total > 0 && (
          <Text c="dimmed" size="sm">
            {progress.done}/{progress.total}
          </Text>
        )}
        {outputDir && (
          <Button
            variant="light"
            leftSection={<IconFolderOpen size={18} />}
            onClick={() => void openPath(outputDir)}
          >
            Mở thư mục
          </Button>
        )}
      </Group>
    </div>
  );
}
