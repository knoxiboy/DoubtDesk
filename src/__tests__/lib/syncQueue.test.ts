import {
    getQueue,
    syncOfflineQueue,
} from "@/lib/offline/syncQueue";




describe("syncQueue", () => {
    it("returns empty array when IndexedDB is unavailable", async () => {
        const originalIndexedDB = window.indexedDB;

        Object.defineProperty(window, "indexedDB", {
            value: undefined,
            configurable: true,
        });

        const result = await getQueue();

        expect(result).toEqual([]);

        Object.defineProperty(window, "indexedDB", {
            value: originalIndexedDB,
            configurable: true,
        });
    });

    it("exits immediately when offline", async () => {
        const originalOnline = navigator.onLine;

        Object.defineProperty(navigator, "onLine", {
            value: false,
            configurable: true,
        });

        await expect(syncOfflineQueue()).resolves.toBeUndefined();

        Object.defineProperty(navigator, "onLine", {
            value: originalOnline,
            configurable: true,
        });
    });

    it("handles browsers without navigator.locks", async () => {
        const originalLocks = (navigator as any).locks;

        Object.defineProperty(navigator, "onLine", {
            value: true,
            configurable: true,
        });

        (navigator as any).locks = undefined;

        await expect(syncOfflineQueue()).resolves.toBeUndefined();

        (navigator as any).locks = originalLocks;
    });

    it("returns empty array when IndexedDB open fails", async () => {

        const originalIndexedDB = window.indexedDB;

        Object.defineProperty(window, "indexedDB", {
            value: {
                open: jest.fn(() => {
                    throw new Error("DB failure");
                }),
            },
            configurable: true,
        });

        const result = await getQueue();

        expect(result).toEqual([]);

        Object.defineProperty(window, "indexedDB", {
            value: originalIndexedDB,
            configurable: true,
        });
    });

});