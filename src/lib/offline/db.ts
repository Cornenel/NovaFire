/** Minimal IndexedDB wrapper for the offline outbox (stores Blobs natively). */

import type { OfflineOp } from "./operations";

const DB_NAME = "nf-offline";
const DB_VERSION = 1;
const STORE = "outbox";

export interface OutboxItem {
  id: string;
  op: OfflineOp;
  createdAt: number;
  attempts: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      })
  );
}

export function outboxAdd(item: OutboxItem): Promise<IDBValidKey> {
  return tx("readwrite", (s) => s.add(item));
}

export function outboxGetAll(): Promise<OutboxItem[]> {
  return tx("readonly", (s) => s.getAll() as IDBRequest<OutboxItem[]>);
}

export function outboxDelete(id: string): Promise<undefined> {
  return tx("readwrite", (s) => s.delete(id) as IDBRequest<undefined>);
}

export function outboxPut(item: OutboxItem): Promise<IDBValidKey> {
  return tx("readwrite", (s) => s.put(item));
}

export function outboxCount(): Promise<number> {
  return tx("readonly", (s) => s.count());
}
