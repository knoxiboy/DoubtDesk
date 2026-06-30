import { encodeCursor, decodeCursor } from "@/lib/pagination";

describe("pagination cursor", () => {
  it("round-trips a (createdAt, id) key", () => {
    const createdAt = new Date("2026-06-01T12:34:56.000Z");
    const cursor = encodeCursor(createdAt, 42);
    const decoded = decodeCursor(cursor);
    expect(decoded).not.toBeNull();
    expect(decoded!.id).toBe(42);
    expect(decoded!.createdAt.toISOString()).toBe(createdAt.toISOString());
  });

  it("accepts a Date, ISO string, or epoch ms as input", () => {
    const iso = "2026-01-15T08:00:00.000Z";
    const fromDate = decodeCursor(encodeCursor(new Date(iso), 1));
    const fromString = decodeCursor(encodeCursor(iso, 1));
    const fromEpoch = decodeCursor(encodeCursor(new Date(iso).getTime(), 1));
    expect(fromDate!.createdAt.toISOString()).toBe(iso);
    expect(fromString!.createdAt.toISOString()).toBe(iso);
    expect(fromEpoch!.createdAt.toISOString()).toBe(iso);
  });

  it("produces an opaque base64 string (no raw delimiter leakage)", () => {
    const cursor = encodeCursor(new Date("2026-06-01T00:00:00.000Z"), 7);
    expect(cursor).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(cursor).not.toContain("|");
  });

  it("returns null for null/empty/garbage input instead of throwing", () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor("not-base64-!!!")).toBeNull();
    expect(decodeCursor(Buffer.from("garbage-no-separator").toString("base64"))).toBeNull();
  });

  it("rejects a cursor with a non-numeric id", () => {
    const bad = Buffer.from("2026-06-01T00:00:00.000Z|abc").toString("base64");
    expect(decodeCursor(bad)).toBeNull();
  });

  it("rejects a cursor with an invalid date", () => {
    const bad = Buffer.from("not-a-date|5").toString("base64");
    expect(decodeCursor(bad)).toBeNull();
  });
});
