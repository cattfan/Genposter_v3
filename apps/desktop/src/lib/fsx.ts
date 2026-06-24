/** Thin wrappers over the Tauri fs plugin with absolute paths. */
import {
  exists as fsExists,
  mkdir,
  readDir as fsReadDir,
  readFile,
  readTextFile,
  remove as fsRemove,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";

export async function exists(path: string): Promise<boolean> {
  try {
    return await fsExists(path);
  } catch {
    return false;
  }
}

export async function ensureDir(path: string): Promise<void> {
  if (!(await exists(path))) {
    await mkdir(path, { recursive: true });
  }
}

export async function readText(path: string): Promise<string> {
  return readTextFile(path);
}

export async function writeText(path: string, content: string): Promise<void> {
  await writeTextFile(path, content);
}

export async function readBytes(path: string): Promise<Uint8Array> {
  return readFile(path);
}

export async function writeBytes(path: string, bytes: Uint8Array): Promise<void> {
  await writeFile(path, bytes);
}

export async function remove(path: string): Promise<void> {
  await fsRemove(path);
}

export interface Entry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
}

export async function readDir(path: string): Promise<Entry[]> {
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

/** Convert an absolute local path into an asset URL the webview can load. */
export function assetUrl(path: string): string {
  return convertFileSrc(path);
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
