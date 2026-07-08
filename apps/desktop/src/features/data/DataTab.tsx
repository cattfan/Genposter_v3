import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Group,
  Loader,
  Progress,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconCloudDownload,
  IconDatabase,
  IconRefresh,
  IconSearch,
  IconX,
} from "@tabler/icons-react";

import {
  cachedSheetView,
  listCachedSheetNames,
  loadCacheIndex,
  PHOTO_COL,
  syncProvince,
  type CachedSheetView,
  type ServerUpdateStatus,
} from "../../lib/sync.js";
import {
  lastUpdateStatus,
  onUpdateStatus,
  refreshUpdateStatus,
} from "../../lib/update-poller.js";
import { canPersistLocalFiles, assetUrl } from "../../lib/fsx.js";
import { settings } from "../../lib/settings.js";
import { DataPhotoViewer } from "./DataPhotoViewer.js";
import "./data.css";

const AUTO_SYNC_COOLDOWN_MS = 45_000;

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

function formatSyncedAt(iso: string | null): string {
  if (!iso) return "chưa đồng bộ";
  try {
    return new Date(iso).toLocaleString("vi-VN");
  } catch {
    return iso;
  }
}

function formatDataError(e: unknown): string {
  const msg = String(e);
  if (msg.includes("'invoke'")) {
    return "Không đọc được file local. Reload trang hoặc chạy pnpm dev từ thư mục gốc.";
  }
  if (/mapping\.yaml/i.test(msg)) {
    return `Không đọc được mapping. Kiểm tra data/mapping.yaml. (${msg})`;
  }
  return msg.replace(/^Error:\s*/, "");
}

function formatSyncError(e: unknown): string {
  const msg = String(e);
  if (msg.includes("Thao tác ghi file")) {
    return "Không ghi được cache. Reload trang (Vite cần restart sau khi cập nhật code).";
  }
  if (/token|401|403|Unauthorized/i.test(msg)) {
    return "Không kết nối được NocoDB. Kiểm tra token trong apps/desktop/.env rồi restart dev.";
  }
  if (/Failed to fetch|NetworkError|ERR_|fetch failed/i.test(msg)) {
    return "Không kết nối được server dữ liệu. Kiểm tra mạng LAN rồi bấm Cập nhật ngay.";
  }
  return formatDataError(e);
}

export function DataTab() {
  const [names, setNames] = useState<string[]>([]);
  const [active, setActive] = useState("");
  const [sheetView, setSheetView] = useState<CachedSheetView>({ headers: [], rows: [] });
  const [query, setQuery] = useState("");
  // Starts true so the boot render shows the cache loader, not the empty state.
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProg, setSyncProg] = useState({ done: 0, total: 0 });
  const [syncLabel, setSyncLabel] = useState("");
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<ServerUpdateStatus | null>(
    lastUpdateStatus,
  );
  const [err, setErr] = useState<string | null>(null);
  const [photoView, setPhotoView] = useState<{ paths: string[]; index: number } | null>(null);
  const cacheReady = useRef(false);
  const initialSyncDone = useRef(false);
  const lastAutoSyncAt = useRef(0);
  const syncBusy = useRef(false);
  const activeRef = useRef("");

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const loadSyncedAt = useCallback(async () => {
    const province = settings().server.province || "dalat";
    const idx = await loadCacheIndex(province);
    setSyncedAt(idx?.syncedAt ?? null);
  }, []);

  async function loadNames() {
    try {
      const ns = await listCachedSheetNames();
      setNames(ns);
      return ns;
    } catch (e) {
      setErr(formatDataError(e));
      return [];
    }
  }

  async function loadGrid(sheet: string) {
    if (!sheet) return;
    setLoading(true);
    try {
      const view = await cachedSheetView(sheet);
      setSheetView(view);
      setErr(null);
      if (view.rows.length > 0) cacheReady.current = true;
    } catch (e) {
      setSheetView({ headers: [], rows: [] });
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  const doSync = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (syncBusy.current || !canPersistLocalFiles()) return;
      syncBusy.current = true;
      setSyncing(true);
      setSyncProg({ done: 0, total: 0 });
      setSyncLabel("Đang kết nối server…");
      if (!opts?.silent) setErr(null);
      try {
        const r = await syncProvince({
          onProgress: (done, total, label) => {
            setSyncProg({ done, total });
            if (label) setSyncLabel(label);
          },
        });
        lastAutoSyncAt.current = Date.now();
        await loadSyncedAt();
        const ns = await loadNames();
        const cur = activeRef.current;
        const target = ns.includes(cur) ? cur : (ns[0] ?? "");
        setActive(target);
        if (target) await loadGrid(target);
        cacheReady.current = true;
        if (!opts?.silent) {
          notifications.show({
            color: "teal",
            message: `Đã cập nhật: ${r.rows} dòng, ${r.photosDownloaded} ảnh mới.`,
            position: "bottom-right",
          });
        }
        if (r.missingSheets.length > 0) {
          // Surfaced even on a silent auto-sync — this means a whole sheet's
          // data could otherwise go stale/missing without the user noticing.
          notifications.show({
            color: "yellow",
            message: `Không thấy bảng trên server cho: ${r.missingSheets.join(", ")} — kiểm tra mapping.yaml / base NocoDB. Dữ liệu cũ của các bảng này vẫn được giữ.`,
            position: "bottom-right",
            autoClose: 8000,
          });
        }
        window.dispatchEvent(new Event("genposter:data-synced"));
      } catch (e) {
        if (!opts?.silent || !cacheReady.current) {
          setErr(formatSyncError(e));
        }
      } finally {
        setSyncing(false);
        setSyncLabel("");
        syncBusy.current = false;
      }
    },
    [loadSyncedAt],
  );

  const maybeAutoSync = useCallback(() => {
    if (!canPersistLocalFiles() || syncBusy.current) return;
    if (Date.now() - lastAutoSyncAt.current < AUTO_SYNC_COOLDOWN_MS) return;
    void doSync({ silent: true });
  }, [doSync]);

  // Cache-first: show whatever is on disk immediately; sync only when needed.
  useEffect(() => {
    void (async () => {
      try {
        const ns = await loadNames();
        await loadSyncedAt();
        const province = settings().server.province || "dalat";
        const idx = await loadCacheIndex(province);

        if (ns.length && idx) {
          setActive(ns[0]!);
          await loadGrid(ns[0]!);
          // The first poll may have finished before the grid was ready.
          if (lastUpdateStatus()?.stale) maybeAutoSync();
        }

        if (!idx && !initialSyncDone.current) {
          initialSyncDone.current = true;
          await doSync({ silent: true });
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shared poller drives both the badge and the background auto-sync.
  useEffect(
    () =>
      onUpdateStatus((st) => {
        setUpdateStatus(st);
        if (st.stale && cacheReady.current) maybeAutoSync();
      }),
    [maybeAutoSync],
  );

  async function switchSheet(name: string) {
    if (name === active) return;
    setActive(name);
    setQuery("");
    await loadGrid(name);
  }

  const headers = sheetView.headers;

  const bodyRows = useMemo(() => {
    const body = sheetView.rows.map((row, i) => ({ row, n: i + 2 }));
    const q = query.trim().toLowerCase();
    if (!q) return body;
    return body.filter(({ row }) => {
      const text = Object.values(row.fields).join(" ").toLowerCase();
      const photoHint = row.photoPaths.length ? `${row.photoPaths.length} anh` : "";
      return `${text} ${photoHint}`.includes(q);
    });
  }, [sheetView.rows, query]);

  const rowCount = sheetView.rows.length;
  const syncPercent = syncProg.total > 0 ? (syncProg.done / syncProg.total) * 100 : 0;
  const showEmpty = !loading && !syncing && !err && rowCount === 0;
  const stale = updateStatus?.stale ?? false;
  const offline = updateStatus?.reason === "offline";

  const statusHint = syncing
    ? " · đang cập nhật nền…"
    : offline
      ? " · offline, dùng dữ liệu máy"
      : stale && rowCount > 0
        ? " · server có bản mới"
        : "";

  return (
    <div className="data-tab">
      <Group className="data-head" gap="md" align="center" wrap="wrap">
        <Box mr="auto">
          <Text className="data-head__eyebrow" size="xs" tt="uppercase" fw={700}>
            Riviu · NocoDB
          </Text>
          <Title order={3} className="data-head__title">
            Dữ liệu
          </Title>
          <Text c="dimmed" size="sm">
            {active ? `${active}` : "—"}
            {rowCount > 0 ? ` · ${rowCount} dòng` : ""}
            {syncedAt ? ` · cache ${formatSyncedAt(syncedAt)}` : ""}
            {statusHint}
          </Text>
        </Box>
        <TextInput
          w={260}
          placeholder="Tìm trong bảng…"
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
        <Tooltip label="Tải lại từ cache máy" withArrow>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={() => void (async () => {
              if (active) await loadGrid(active);
              await loadSyncedAt();
              await refreshUpdateStatus();
            })()}
          >
            Tải lại
          </Button>
        </Tooltip>
        <Button
          className="data-sync-btn"
          color="riviu"
          leftSection={<IconCloudDownload size={16} />}
          onClick={() => void doSync()}
          loading={syncing}
          disabled={syncing}
        >
          Cập nhật ngay
        </Button>
      </Group>

      {syncing && (
        <Box className="data-sync-bar" px="md" py="xs">
          <Group justify="space-between" mb={6} gap="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate>
              {syncLabel || "Đang đồng bộ từ server…"}
            </Text>
            {syncProg.total > 0 && (
              <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                {syncProg.done}/{syncProg.total}
              </Text>
            )}
          </Group>
          <Progress
            value={syncProg.total > 0 ? syncPercent : 100}
            animated
            striped={syncProg.total === 0}
            color="riviu"
            size="sm"
          />
        </Box>
      )}

      {err && (
        <Alert icon={<IconAlertTriangle size={18} />} color="red" title="Lỗi" m="md">
          {err}
        </Alert>
      )}

      <div className="data-grid-wrap">
        {loading && rowCount === 0 && !syncing ? (
          <Stack align="center" justify="center" gap="sm" py={80} className="data-empty">
            <Loader size="sm" color="riviu" />
            <Text c="dimmed" size="sm">
              Đang đọc cache…
            </Text>
          </Stack>
        ) : showEmpty ? (
          <Stack align="center" justify="center" gap="md" py={80} className="data-empty">
            <ThemeIconPlaceholder />
            <Stack gap={4} align="center">
              <Text fw={600}>Chưa có dữ liệu local</Text>
              <Text c="dimmed" size="sm" ta="center" maw={360}>
                {offline
                  ? "Không kết nối được server. Kiểm tra mạng rồi bấm Cập nhật ngay."
                  : "Bấm Cập nhật ngay để tải từ server."}
              </Text>
            </Stack>
            <Button
              color="riviu"
              leftSection={<IconCloudDownload size={16} />}
              onClick={() => void doSync()}
            >
              Cập nhật ngay
            </Button>
          </Stack>
        ) : rowCount === 0 ? null : (
          <table className="data-grid">
            <thead>
              <tr>
                <th className="rownum" />
                {headers.map((h, i) => (
                  <th key={i} className={h === PHOTO_COL ? "col-anh" : undefined}>
                    {colLetter(i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="headrow">
                <td className="rownum">1</td>
                {headers.map((h, i) => (
                  <td key={i} className={h === PHOTO_COL ? "col-anh" : undefined} title={h}>
                    {h}
                  </td>
                ))}
              </tr>
              {bodyRows.map(({ row, n }) => (
                <tr key={n}>
                  <td className="rownum">{n}</td>
                  {headers.map((h, i) => (
                    <td
                      key={i}
                      className={h === PHOTO_COL ? "col-anh" : undefined}
                      title={h === PHOTO_COL ? `${row.photoPaths.length} ảnh` : (row.fields[h] ?? "")}
                    >
                      {h === PHOTO_COL ? (
                        <PhotoColumn
                          paths={row.photoPaths}
                          onView={(index) => setPhotoView({ paths: row.photoPaths, index })}
                        />
                      ) : (
                        (row.fields[h] ?? "")
                      )}
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

      <DataPhotoViewer
        paths={photoView?.paths ?? []}
        index={photoView?.index ?? -1}
        onClose={() => setPhotoView(null)}
        onChange={(index) =>
          setPhotoView((v) => (v ? { ...v, index } : null))
        }
      />
    </div>
  );
}

function PhotoColumn({
  paths,
  onView,
}: {
  paths: string[];
  onView: (index: number) => void;
}) {
  if (!paths.length) {
    return (
      <Text c="dimmed" size="xs">
        —
      </Text>
    );
  }
  return (
    <div className="data-grid__photos data-grid__photos--row">
      {paths.map((p, i) => (
        <button
          key={`${p}-${i}`}
          type="button"
          className="data-grid__thumb-btn"
          title={`Ảnh ${i + 1}`}
          onClick={() => onView(i)}
        >
          <img src={assetUrl(p)} alt="" className="data-grid__thumb" loading="lazy" />
        </button>
      ))}
    </div>
  );
}

function ThemeIconPlaceholder() {
  return (
    <Box className="data-empty__icon">
      <IconDatabase size={28} stroke={1.5} color="var(--rv-orange)" />
    </Box>
  );
}
