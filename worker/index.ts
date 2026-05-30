const DB_NAME = "doubtDeskOfflineDB";
const STORE_NAME = "syncQueue";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getQueue(db: IDBDatabase): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const items = request.result || [];
      items.sort((a: any, b: any) => a.timestamp - b.timestamp);
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

function removeFromQueue(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function syncOfflineQueue() {
  try {
    const db = await openDB();
    const queue = await getQueue(db);
    if (queue.length === 0) return;

    for (const item of queue) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload)
        });

        if (response.ok) {
          await removeFromQueue(db, item.id);
        } else if (response.status === 401) {
          // Capturing 401 Unauthorized
          // Notify active clients if any
          const clientsList = await (self as any).clients.matchAll();
          for (const client of clientsList) {
            client.postMessage({ type: "SYNC_AUTH_REQUIRED", itemId: item.id });
          }
          break;
        } else if (response.status === 400 || response.status === 422) {
          // Remove client validation errors
          await removeFromQueue(db, item.id);
        } else {
          // Server error, stop and retry later
          break;
        }
      } catch (error) {
        // Network error, stop and retry later
        break;
      }
    }
  } catch (err) {
    console.error("SW Background Sync failed:", err);
  }
}

(self as any).addEventListener("sync", (event: any) => {
  if (event.tag === "doubtDeskSyncQueue" || event.tag === "sync-offline") {
    event.waitUntil(syncOfflineQueue());
  }
});
