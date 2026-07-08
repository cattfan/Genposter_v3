/**
 * Single shared poller for server update status. All tabs listen to the
 * same event instead of each running its own interval against NocoDB.
 */
import { checkServerUpdates, type ServerUpdateStatus } from "./sync.js";

export const UPDATE_STATUS_EVENT = "genposter:update-status";
const POLL_MS = 90_000;

let timer: number | null = null;
let inFlight: Promise<ServerUpdateStatus> | null = null;
let lastStatus: ServerUpdateStatus | null = null;

/** Latest known status (null until the first check finishes). */
export function lastUpdateStatus(): ServerUpdateStatus | null {
  return lastStatus;
}

/** Run a check now (deduped) and broadcast the result. */
export function refreshUpdateStatus(): Promise<ServerUpdateStatus> {
  if (!inFlight) {
    inFlight = checkServerUpdates()
      .then((st) => {
        lastStatus = st;
        window.dispatchEvent(new CustomEvent(UPDATE_STATUS_EVENT, { detail: st }));
        return st;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** Start the app-wide polling loop (idempotent). */
export function startUpdatePolling(): void {
  if (timer !== null) return;
  void refreshUpdateStatus();
  timer = window.setInterval(() => void refreshUpdateStatus(), POLL_MS);
  window.addEventListener("genposter:data-synced", onSynced);
}

function onSynced() {
  void refreshUpdateStatus();
}

/** Subscribe to status broadcasts; returns an unsubscribe function. */
export function onUpdateStatus(fn: (st: ServerUpdateStatus) => void): () => void {
  const handler = (e: Event) => fn((e as CustomEvent<ServerUpdateStatus>).detail);
  window.addEventListener(UPDATE_STATUS_EVENT, handler);
  return () => window.removeEventListener(UPDATE_STATUS_EVENT, handler);
}
