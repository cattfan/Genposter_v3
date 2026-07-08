/** Thin wrappers over the Tauri fs plugin with absolute paths. */
import {
  exists as fsExists,
  mkdir,
  readDir as fsReadDir,
  readFile,
  readTextFile,
  remove as fsRemove,
  rename as fsRename,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";

import { settings } from "./settings.js";
import { isTauri } from "./tauri-env.js";

function projectRel(absPath: string): string | null {
  const root = settings().rootDir.replace(/\\/g, "/").replace(/\/+$/, "");
  const norm = absPath.replace(/\\/g, "/");
  if (norm === root) return "";
  if (!norm.startsWith(`${root}/`)) return null;
  return norm.slice(root.length + 1);
}

function devFsUrl(rel: string): string {
  return `/dev-fs/${rel.split("/").map(encodeURIComponent).join("/")}`;
}

function useDevFs(): boolean {
  return import.meta.env.DEV && !isTauri();
}

async function readTextDev(absPath: string): Promise<string> {
  const rel = projectRel(absPath);
  if (rel === null) {
    throw new Error(`Path ngoài thư mục dự án: ${absPath}`);
  }
  const r = await fetch(devFsUrl(rel));
  if (!r.ok) throw new Error(`Không đọc được ${rel} (${r.status})`);
  return r.text();
}

async function readBytesDev(absPath: string): Promise<Uint8Array> {
  const rel = projectRel(absPath);
  if (rel === null) {
    throw new Error(`Path ngoài thư mục dự án: ${absPath}`);
  }
  const r = await fetch(devFsUrl(rel));
  if (!r.ok) throw new Error(`Không đọc được ${rel} (${r.status})`);
  return new Uint8Array(await r.arrayBuffer());
}

async function existsDev(absPath: string): Promise<boolean> {
  const rel = projectRel(absPath);
  if (rel === null) return false;
  const r = await fetch(devFsUrl(rel), { method: "HEAD" });
  return r.ok;
}

async function ensureDirDev(absPath: string): Promise<void> {
  const rel = projectRel(absPath);
  if (rel === null) {
    throw new Error(`Path ngoài thư mục dự án: ${absPath}`);
  }
  const r = await fetch(devFsUrl(`__mkdir/${rel}`), { method: "POST" });
  if (!r.ok) throw new Error(`Không tạo được thư mục ${rel} (${r.status})`);
}

async function writeBytesDev(absPath: string, bytes: Uint8Array): Promise<void> {
  const rel = projectRel(absPath);
  if (rel === null) {
    throw new Error(`Path ngoài thư mục dự án: ${absPath}`);
  }
  const r = await fetch(devFsUrl(rel), {
    method: "PUT",
    body: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  });
  if (!r.ok) throw new Error(`Không ghi được ${rel} (${r.status})`);
}

async function removeDev(absPath: string, opts?: { recursive?: boolean }): Promise<void> {
  const rel = projectRel(absPath);
  if (rel === null) {
    throw new Error(`Path ngoài thư mục dự án: ${absPath}`);
  }
  const q = opts?.recursive ? "?recursive=1" : "";
  const r = await fetch(`${devFsUrl(rel)}${q}`, { method: "DELETE" });
  if (!r.ok && r.status !== 404) throw new Error(`Không xoá được ${rel} (${r.status})`);
}

async function readDirDev(absPath: string): Promise<Entry[]> {
  const rel = projectRel(absPath);
  if (rel === null) return [];
  const r = await fetch(devFsUrl(`__dir/${rel}`));
  if (!r.ok) return [];
  return (await r.json()) as Entry[];
}

async function renameDev(fromAbs: string, toAbs: string): Promise<void> {
  const from = projectRel(fromAbs);
  const to = projectRel(toAbs);
  if (from === null || to === null) {
    throw new Error(`Path ngoài thư mục dự án: ${fromAbs} → ${toAbs}`);
  }
  const r = await fetch(
    `${devFsUrl(`__rename/${from}`)}?to=${encodeURIComponent(to)}`,
    { method: "POST" },
  );
  if (!r.ok) throw new Error(`Không đổi tên được ${from} → ${to} (${r.status})`);
}

function requireDesktopWrite(): never {
  throw new Error("Thao tác ghi file cần cửa sổ Genposter V3 (pnpm dev từ thư mục gốc).");
}

/** Local read/write via Tauri or Vite dev-fs in browser dev. */
export function canPersistLocalFiles(): boolean {
  return isTauri() || import.meta.env.DEV;
}

export async function exists(path: string): Promise<boolean> {
  if (isTauri()) {
    try {
      return await fsExists(path);
    } catch {
      return false;
    }
  }
  if (useDevFs()) return existsDev(path);
  return false;
}

export async function ensureDir(path: string): Promise<void> {
  if (isTauri()) {
    if (!(await exists(path))) {
      await mkdir(path, { recursive: true });
    }
    return;
  }
  if (useDevFs()) {
    await ensureDirDev(path);
    return;
  }
  requireDesktopWrite();
}

export async function readText(path: string): Promise<string> {
  if (isTauri()) return readTextFile(path);
  if (useDevFs()) return readTextDev(path);
  throw new Error("Genposter cần chạy trong cửa sổ desktop (pnpm dev).");
}

export async function writeText(path: string, content: string): Promise<void> {
  if (isTauri()) {
    await writeTextFile(path, content);
    return;
  }
  if (useDevFs()) {
    await writeBytesDev(path, new TextEncoder().encode(content));
    return;
  }
  requireDesktopWrite();
}

export async function readBytes(path: string): Promise<Uint8Array> {
  if (isTauri()) return readFile(path);
  if (useDevFs()) return readBytesDev(path);
  throw new Error("Genposter cần chạy trong cửa sổ desktop (pnpm dev).");
}

export async function writeBytes(path: string, bytes: Uint8Array): Promise<void> {
  if (isTauri()) {
    await writeFile(path, bytes);
    return;
  }
  if (useDevFs()) {
    await writeBytesDev(path, bytes);
    return;
  }
  requireDesktopWrite();
}

export async function remove(path: string, opts?: { recursive?: boolean }): Promise<void> {
  if (isTauri()) {
    await fsRemove(path, opts);
    return;
  }
  if (useDevFs()) {
    await removeDev(path, opts);
    return;
  }
  requireDesktopWrite();
}

/**
 * Rename/move a file or directory. Overwrites an existing destination file;
 * a destination directory must be removed first (Windows semantics).
 */
export async function rename(from: string, to: string): Promise<void> {
  if (isTauri()) {
    await fsRename(from, to);
    return;
  }
  if (useDevFs()) {
    await renameDev(from, to);
    return;
  }
  requireDesktopWrite();
}

export interface Entry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
}

export async function readDir(path: string): Promise<Entry[]> {
  if (isTauri()) {
    try {
      const entries = await fsReadDir(path);
      return entries.map((e) => ({
        name: e.name,
        isDirectory: Boolean(e.isDirectory),
        isFile: Boolean(e.isFile),
      }));
    } catch {
      return [];
    }
  }
  if (useDevFs()) return readDirDev(path);
  return [];
}

/** Convert an absolute local path into an asset URL the webview can load. */
export function assetUrl(path: string): string {
  if (isTauri()) return convertFileSrc(path);
  const rel = projectRel(path);
  if (rel !== null && useDevFs()) {
    return devFsUrl(rel);
  }
  return path;
}

/** Decode a data URL (data:[mime];base64,XXXX) into raw bytes. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
