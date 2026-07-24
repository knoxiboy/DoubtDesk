import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream, TransformStream, WritableStream } from 'stream/web';
import { MessageChannel, MessagePort } from 'worker_threads';
import { Blob } from 'buffer';

global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;
global.ReadableStream = ReadableStream as any;
global.TransformStream = TransformStream as any;
global.WritableStream = WritableStream as any;
global.MessageChannel = MessageChannel as any;
global.MessagePort = MessagePort as any;
global.Blob = Blob as any;

if (!String.prototype.toWellFormed) {
    String.prototype.toWellFormed = function () {
        return this.toString();
    };
}

const { Request, Response, Headers, fetch, FormData: UndiciFormData } = require('undici');
global.FormData = (globalThis.FormData || UndiciFormData) as any;

Object.defineProperties(globalThis, {
    Request: { value: Request, writable: true, configurable: true },
    Response: { value: Response, writable: true, configurable: true },
    Headers: { value: Headers, writable: true, configurable: true },
    fetch: { value: fetch, writable: true, configurable: true },
    FormData: { value: global.FormData, writable: true, configurable: true },
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Mock IntersectionObserver
(global as any).IntersectionObserver = class IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
    disconnect() {}
    observe() {}
    takeRecords() { return []; }
    unobserve() {}
};

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock ESM Markdown packages
jest.mock("react-markdown", () => ({ children }: { children: any }) => children);
jest.mock("remark-gfm", () => () => {});
jest.mock("rehype-sanitize", () => ({
    __esModule: true,
    default: () => {},
    defaultSchema: { attributes: {} }
}));
jest.mock("react-syntax-highlighter", () => ({
    Prism: ({ children }: { children: any }) => children,
}));
jest.mock("react-syntax-highlighter/dist/esm/styles/prism", () => ({
    atomDark: {},
}));
jest.mock("remark-math", () => () => {});
jest.mock("rehype-katex", () => () => {});
jest.mock("react-hotkeys-hook", () => ({
    useHotkeys: () => {}
}));

jest.mock("@/lib/ratelimit/ratelimit", () => {
    const memoryMap = new Map<string, { count: number; reset: number }>();

    const createLimiter = (limit: number, windowMs: number) => ({
        limit: jest.fn().mockImplementation(async (identifier: string) => {
            const now = Date.now();
            const record = memoryMap.get(identifier) || { count: 0, reset: now + windowMs };

            if (now > record.reset) {
                record.count = 0;
                record.reset = now + windowMs;
            }

            record.count++;
            memoryMap.set(identifier, record);

            return {
                success: record.count <= limit,
                limit,
                remaining: Math.max(0, limit - record.count),
                reset: record.reset,
            };
        }),
    });

    const resetMemoryMap = () => memoryMap.clear();

    return {
        aiLimiter: createLimiter(10, 60 * 1000),
        generalLimiter: createLimiter(30, 60 * 1000),
        emailNotificationLimiter: createLimiter(1, 5 * 60 * 1000),
        videoLimiter: createLimiter(3, 60 * 60 * 1000),
        inviteCodeLimiter: createLimiter(5, 60 * 1000),
        redisClient: {
            setnx: jest.fn().mockResolvedValue(1),
            del: jest.fn().mockResolvedValue(1),
            expire: jest.fn().mockResolvedValue(1),
        },
        resetMemoryMap,
    };
});
