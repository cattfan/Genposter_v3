import { zipSync } from "fflate";

/** Zip a map of in-zip-path -> bytes. Store level 6. */
export function makeZip(files: Record<string, Uint8Array>): Uint8Array {
  return zipSync(files, { level: 6 });
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Windows-safe zip file name: Genposter_YYYY-MM-DD_HH-MM.zip (no colons). */
export function timestampZipName(d: Date = new Date()): string {
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const time = `${pad2(d.getHours())}-${pad2(d.getMinutes())}`;
  return `Genposter_${date}_${time}.zip`;
}
