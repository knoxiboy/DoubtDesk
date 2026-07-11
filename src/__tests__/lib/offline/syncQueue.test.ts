import {
    addToQueue,
    getPendingDoubts,
    getPendingReplies,
    getQueue,
    syncOfflineQueue,
    type SyncItem,
} from "@/lib/offline/syncQueue";

type MockStore = Map<string, SyncItem>;

function createIndexedDbMock() {
    const store: MockStore = new Map();
    let objectStoreCreated = false;

    const createAsyncRequest = <T,>(result?: T) => {
        const request: any = {
            result,
            error: null,
            onsuccess: null,
            onerror: null,
        };

        queueMicrotask(() => {
            request.onsuccess?.({ target: request });
        });

        return request;
    };

    const database: any = {
        objectStoreNames: {
            contains: (name: string) => objectStoreCreated && name === "syncQueue",
        },
        createObjectStore: () => {
            objectStoreCreated = true;
        },
        transaction: () => ({
            objectStore: () => ({
                put: (item: SyncItem) => {
                    store.set(item.id, item);
                    return createAsyncRequest(item);
                },
                getAll: () => createAsyncRequest(Array.from(store.values())),
                delete: (id: string) => {
                    store.delete(id);
                    return createAsyncRequest(undefined);
                },
            }),
        }),
        close: jest.fn(),
    };

    const indexedDB = {
        open: jest.fn(() => {
            const request: any = {
                result: database,
                error: null,
                onupgradeneeded: null,
                onsuccess: null,
                onerror: null,
            };

            queueMicrotask(() => {
                request.onupgradeneeded?.({ target: request });
                request.onsuccess?.({ target: request });
            });

            return request;
        }),
    };

    return { indexedDB, store };
}

function installIndexedDbMock() {
    const mock = createIndexedDbMock();
    Object.defineProperty(window, "indexedDB", {
        value: mock.indexedDB,
        configurable: true,
    });
    Object.defineProperty(globalThis, "indexedDB", {
        value: mock.indexedDB,
        configurable: true,
    });
    return mock;
}

describe("syncQueue", () => {
    let indexedDbMock: ReturnType<typeof createIndexedDbMock>;
    let dispatchSpy: jest.SpyInstance;

    beforeEach(() => {
        indexedDbMock = installIndexedDbMock();
        Object.defineProperty(window.navigator, "onLine", {
            value: true,
            configurable: true,
        });
        dispatchSpy = jest.spyOn(window, "dispatchEvent");
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it("stores queue items and adds a createdAt timestamp when missing", async () => {
        const item = await addToQueue("/api/doubts", "POST", {
            subject: "First doubt",
            content: "Can we test this?",
        });

        expect(item.url).toBe("/api/doubts");
        expect(item.payload.createdAt).toEqual(expect.any(String));
        expect(new Date(item.payload.createdAt).toString()).not.toBe("Invalid Date");
        expect(indexedDbMock.store.get(item.id)).toEqual(item);
        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({ type: "sync-queue-updated" }),
        );
    });

    it("returns pending doubts and replies from the queue", async () => {
        indexedDbMock.store.set("doubt-1", {
            id: "doubt-1",
            url: "/api/doubts",
            method: "POST",
            payload: {
                subject: "Offline subject",
                content: "Offline content",
                tags: ["math", "exam"],
                imageUrl: "/image.png",
                createdAt: "2024-02-01T10:00:00.000Z",
            },
            timestamp: 1_700_000_000_000,
        });
        indexedDbMock.store.set("reply-1", {
            id: "reply-1",
            url: "/api/replies",
            method: "POST",
            payload: {
                doubtId: 42,
                type: "answer",
                content: "Use the quotient rule.",
            },
            timestamp: 1_700_000_100_000,
        });

        await expect(getQueue()).resolves.toHaveLength(2);

        await expect(getPendingDoubts()).resolves.toEqual([
            {
                id: "pending-doubt-1",
                author: "Pending User",
                subject: "Offline subject",
                content: "Offline content",
                imageUrl: "/image.png",
                tags: [{ name: "math" }, { name: "exam" }],
                isSolved: "unsolved",
                createdAt: "2024-02-01T10:00:00.000Z",
                isPendingSync: true,
            },
        ]);

        await expect(getPendingReplies(42)).resolves.toEqual([
            {
                id: "pending-reply-1",
                doubtId: 42,
                author: "Pending User",
                type: "answer",
                content: "Use the quotient rule.",
                imageUrl: "",
                upvotes: 0,
                createdAt: new Date(1_700_000_100_000).toISOString(),
                isPendingSync: true,
            },
        ]);
    });

    it("removes invalid items and stops syncing when auth is required", async () => {
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        indexedDbMock.store.set("doubt-1", {
            id: "doubt-1",
            url: "/api/doubts",
            method: "POST",
            payload: {
                subject: "Invalid payload",
                content: "Will be removed",
            },
            timestamp: 1_700_000_000_000,
        });
        indexedDbMock.store.set("reply-1", {
            id: "reply-1",
            url: "/api/replies",
            method: "POST",
            payload: {
                doubtId: 9,
                content: "Needs sign-in",
            },
            timestamp: 1_700_000_100_000,
        });
        indexedDbMock.store.set("doubt-2", {
            id: "doubt-2",
            url: "/api/doubts",
            method: "POST",
            payload: {
                subject: "Should remain queued",
                content: "Not processed after 401",
            },
            timestamp: 1_700_000_200_000,
        });

        const fetchSpy = jest.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce(new Response("", { status: 400 }))
            .mockResolvedValueOnce(new Response("", { status: 401 }));

        await syncOfflineQueue();

        expect(fetchSpy).toHaveBeenCalledTimes(2);
        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({ type: "sync-auth-required" }),
        );
        expect(Array.from(indexedDbMock.store.keys())).toEqual([
            "reply-1",
            "doubt-2",
        ]);

        consoleErrorSpy.mockRestore();
    });

    it("does nothing while offline", async () => {
        Object.defineProperty(window.navigator, "onLine", {
            value: false,
            configurable: true,
        });

        const fetchSpy = jest.spyOn(globalThis, "fetch");

        await syncOfflineQueue();

        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
