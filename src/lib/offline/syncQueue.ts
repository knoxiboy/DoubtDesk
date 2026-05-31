const DB_NAME = "doubtDeskOfflineDB";
const STORE_NAME = "syncQueue";
const DB_VERSION = 1;

export interface SyncItem {
    id: string; // unique transaction uuid
    url: string; // e.g., '/api/doubts' or '/api/replies'
    method: 'POST';
    payload: any; // original form body
    timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === "undefined" || !window.indexedDB) {
            reject(new Error("IndexedDB is not supported in this environment"));
            return;
        }
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

export async function addToQueue(url: string, method: 'POST', payload: any): Promise<SyncItem> {
    const db = await openDB();
    const item: SyncItem = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
        url,
        method,
        payload: {
            ...payload,
            createdAt: payload.createdAt || new Date().toISOString()
        },
        timestamp: Date.now()
    };
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(item);
        request.onsuccess = () => {
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("sync-queue-updated"));
            }
            resolve(item);
        };
        request.onerror = () => reject(request.error);
    });
}

export async function getQueue(): Promise<SyncItem[]> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => {
                const items = request.result as SyncItem[];
                items.sort((a, b) => a.timestamp - b.timestamp);
                resolve(items);
            };
            request.onerror = () => reject(request.error);
        });
    } catch {
        return [];
    }
}

export async function removeFromQueue(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => {
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("sync-queue-updated"));
            }
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

let isSyncing = false;

export async function syncOfflineQueue(): Promise<void> {
    if (isSyncing) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    
    isSyncing = true;
    try {
        const queue = await getQueue();
        if (queue.length === 0) return;
        
        for (const item of queue) {
            try {
                const response = await fetch(item.url, {
                    method: item.method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(item.payload)
                });
                
                if (response.ok) {
                    await removeFromQueue(item.id);
                } else if (response.status === 401) {
                    if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("sync-auth-required", { detail: item }));
                    }
                    break; // Stop sync queue to prevent dropping/failing subsequent items due to auth
                } else if (response.status === 400 || response.status === 422) {
                    // Remove client validation errors that will never succeed
                    console.error(`Removing invalid sync item ${item.id} (Status: ${response.status})`);
                    await removeFromQueue(item.id);
                } else {
                    break; // Transient or server errors, stop and retry later
                }
            } catch (error) {
                break; // Network errors, stop and retry later
            }
        }
    } finally {
        isSyncing = false;
    }
}

export async function getPendingDoubts(): Promise<any[]> {
    const queue = await getQueue();
    return queue
        .filter(item => item.url === "/api/doubts")
        .map(item => ({
            id: `pending-${item.id}`,
            userName: item.payload.userName || "Anonymous",
            subject: item.payload.subject || "Subject",
            content: item.payload.content || "",
            imageUrl: item.payload.imageUrl || "",
            tags: (item.payload.tags || []).map((t: string) => ({ name: t })),
            isSolved: "unsolved",
            createdAt: item.payload.createdAt || new Date(item.timestamp).toISOString(),
            isPendingSync: true
        }));
}

export async function getPendingReplies(doubtId: number): Promise<any[]> {
    const queue = await getQueue();
    return queue
        .filter(item => item.url === "/api/replies" && item.payload.doubtId === doubtId)
        .map(item => ({
            id: `pending-${item.id}`,
            doubtId,
            userName: item.payload.userName || "Anonymous",
            type: item.payload.type || "comment",
            content: item.payload.content || "",
            imageUrl: item.payload.imageUrl || "",
            upvotes: 0,
            createdAt: item.payload.createdAt || new Date(item.timestamp).toISOString(),
            isPendingSync: true
        }));
}

if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
        syncOfflineQueue();
    });
    // Trigger on initial page load
    window.addEventListener("load", () => {
        syncOfflineQueue();
    });
}
