import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Group,
  Loader,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconAlertTriangle, IconRefresh, IconSearch, IconX } from "@tabler/icons-react";

import { clearWorkbookCache, listAllSheetNames, sheetGrid } from "../../lib/excel.js";
import "./data.css";

/** Excel column letter for a 0-based index: 0 -> A, 25 -> Z, 26 -> AA… */
function colLetter(i: number): string {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function DataTab() {
  const [names, setNames] = useState<string[]>([]);
  const [active, setActive] = useState("");
  const [grid, setGrid] = useState<string[][]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadNames() {
    try {
      const ns = await listAllSheetNames();
      setNames(ns);
      setErr(null);
      return ns;
    } catch (e) {
      setErr(`Không đọc được Excel. Kiểm tra data/mapping.yaml và file database. (${String(e)})`);
      return [];
    }
  }

  async function loadGrid(sheet: string) {
    if (!sheet) return;
    setLoading(true);
    try {
      setGrid(await sheetGrid(sheet));
      setErr(null);
    } catch (e) {
      setGrid([]);
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      const ns = await loadNames();
      if (ns.length) {
        setActive(ns[0]!);
        await loadGrid(ns[0]!);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function switchSheet(name: string) {
    if (name === active) return;
    setActive(name);
    setQuery("");
    await loadGrid(name);
  }

  async function reload() {
    clearWorkbookCache();
    const ns = await loadNames();
    const target = ns.includes(active) ? active : (ns[0] ?? "");
    setActive(target);
    if (target) await loadGrid(target);
  }

  const colCount = useMemo(
    () => grid.reduce((m, r) => Math.max(m, r.length), 0),
    [grid],
  );

  const headerRow = grid[0] ?? [];
  const bodyRows = useMemo(() => {
    // Keep original Excel row numbers (header = row 1, body starts at 2).
    const body = grid.slice(1).map((cells, i) => ({ cells, n: i + 2 }));
    const q = query.trim().toLowerCase();
    if (!q) return body;
    return body.filter((r) => r.cells.some((c) => c.toLowerCase().includes(q)));
  }, [grid, query]);

  return (
    <div className="data-tab">
      <Group className="data-head" gap="md" align="center" wrap="wrap">
        <Box mr="auto">
          <Title order={3}>Dữ liệu</Title>
          <Text c="dimmed" size="sm">
            Xem nội dung Excel như trong bảng tính
            {active ? ` — ${active}` : ""}
            {grid.length > 1 ? ` · ${grid.length - 1} dòng` : ""}
          </Text>
        </Box>
        <TextInput
          w={260}
          placeholder="Tìm trong sheet…"
          leftSection={<IconSearch size={16} />}
          rightSection={
            query ? (
              <ActionIcon variant="subtle" color="gray" onClick={() => setQuery("")}>
                <IconX size={14} />
              </ActionIcon>
            ) : null
          }
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
        <Tooltip label="Đọc lại file Excel" withArrow>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={() => void reload()}
          >
            Tải lại
          </Button>
        </Tooltip>
      </Group>

      {err && (
        <Alert icon={<IconAlertTriangle size={18} />} color="red" title="Lỗi đọc dữ liệu" m="md">
          {err}
        </Alert>
      )}

      <div className="data-grid-wrap">
        {loading ? (
          <Group justify="center" py={60}>
            <Loader size="sm" />
            <Text c="dimmed" size="sm">
              Đang đọc sheet…
            </Text>
          </Group>
        ) : grid.length === 0 ? (
          !err && (
            <Text c="dimmed" size="sm" p="md">
              Sheet trống.
            </Text>
          )
        ) : (
          <table className="data-grid">
            <thead>
              <tr>
                <th className="rownum" />
                {Array.from({ length: colCount }, (_, i) => (
                  <th key={i}>{colLetter(i)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="headrow">
                <td className="rownum">1</td>
                {Array.from({ length: colCount }, (_, i) => (
                  <td key={i} title={headerRow[i] ?? ""}>
                    {headerRow[i] ?? ""}
                  </td>
                ))}
              </tr>
              {bodyRows.map((r) => (
                <tr key={r.n}>
                  <td className="rownum">{r.n}</td>
                  {Array.from({ length: colCount }, (_, i) => (
                    <td key={i} title={r.cells[i] ?? ""}>
                      {r.cells[i] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="data-sheetbar">
        {names.map((n) => (
          <Button
            key={n}
            size="compact-xs"
            radius="sm"
            variant={n === active ? "filled" : "subtle"}
            color={n === active ? "riviu" : "gray"}
            onClick={() => void switchSheet(n)}
          >
            {n}
          </Button>
        ))}
      </div>
    </div>
  );
}
