/**
 * Offline outbox: runs operations immediately when online; queues them in
 * IndexedDB when the network is down and replays them (in order) when
 * connectivity returns.
 */

import {
  outboxAdd,
  outboxCount,
  outboxDelete,
  outboxGetAll,
  outboxPut,
} from "./db";
import { executeOp, type OfflineOp } from "./operations";

type Listener = (pending: number, syncing: boolean) => void;
const listeners = new Set<Listener>();
let syncing = false;

export function subscribeOutbox(listener: Listener): () => void {
  listeners.add(listener);
  void notify();
  return () => listeners.delete(listener);
}

async function notify() {
  try {
    const count = await outboxCount();
    listeners.forEach((l) => l(count, syncing));
  } catch {
    // IndexedDB unavailable (private mode) – outbox disabled
  }
}

function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const msg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("fetch failed") ||
    msg.includes("load failed") ||
    msg.includes("timeout")
  );
}

export interface RunResult {
  queued: boolean;
  error: string | null;
}

/** Execute now, or queue for later if the network is unavailable. */
export async function runOrQueue(op: OfflineOp): Promise<RunResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queue(op);
  }
  try {
    await executeOp(op);
    return { queued: false, error: null };
  } catch (e) {
    if (isNetworkError(e)) return queue(op);
    return {
      queued: false,
      error: e instanceof Error ? e.message : "Something went wrong",
    };
  }
}

async function queue(op: OfflineOp): Promise<RunResult> {
  try {
    await outboxAdd({
      id: crypto.randomUUID(),
      op,
      createdAt: Date.now(),
      attempts: 0,
    });
    void notify();
    return { queued: true, error: null };
  } catch {
    return {
      queued: false,
      error: "Offline and unable to queue locally. Please retry when online.",
    };
  }
}

const MAX_ATTEMPTS = 10;

/** Replays queued operations in order. Stops on the first network failure. */
export async function processOutbox(): Promise<void> {
  if (syncing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  syncing = true;
  void notify();

  try {
    const items = (await outboxGetAll()).sort(
      (a, b) => a.createdAt - b.createdAt
    );
    for (const item of items) {
      try {
        await executeOp(item.op);
        await outboxDelete(item.id);
        void notify();
      } catch (e) {
        if (isNetworkError(e)) break; // still offline – try again later

        // Permanent failure: retry a few times across syncs, then drop so
        // one bad record doesn't block the queue forever.
        item.attempts += 1;
        if (item.attempts >= MAX_ATTEMPTS) {
          console.error("Outbox: dropping operation after repeated failures", item.op.type, e);
          await outboxDelete(item.id);
        } else {
          await outboxPut(item);
        }
      }
    }
  } finally {
    syncing = false;
    void notify();
  }
}
