import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream, TransformStream, WritableStream } from 'stream/web';
import { MessageChannel, MessagePort } from 'worker_threads';
import { Blob, FormData } from 'buffer';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;
global.ReadableStream = ReadableStream as any;
global.TransformStream = TransformStream as any;
global.WritableStream = WritableStream as any;
global.MessageChannel = MessageChannel as any;
global.MessagePort = MessagePort as any;
global.Blob = Blob as any;
global.FormData = FormData as any;

if (!String.prototype.toWellFormed) {
    String.prototype.toWellFormed = function () {
        return this.toString();
    };
}

const { Request, Response, Headers, fetch } = require('undici');

Object.defineProperties(globalThis, {
    Request: { value: Request, writable: true, configurable: true },
    Response: { value: Response, writable: true, configurable: true },
    Headers: { value: Headers, writable: true, configurable: true },
    fetch: { value: fetch, writable: true, configurable: true },
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
global.IntersectionObserver = class IntersectionObserver {
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
