/**
 * Keyset (cursor) pagination helpers for the doubts feed (issue #319).
 *
 * A cursor encodes the ordering key of the last row seen - the doubt's
 * `createdAt` timestamp plus its `id` as a tiebreaker - so the next page can be
 * fetched with a `WHERE (createdAt, id) < (cursorCreatedAt, cursorId)` keyset
 * predicate instead of a growing `OFFSET`. This keeps deep pagination O(log n)
 * on an index rather than O(n).
 *
 * The cursor is an opaque base64 string from the client's perspective.
 */

export interface DecodedCursor {
  createdAt: Date;
  timestamp: Date;
  id: number | null;
}

/** Encode a (createdAt, id) ordering key into an opaque composite cursor string. */
export function encodeCursor(createdAt: Date | string | number, id: number): string {
  const iso = new Date(createdAt).toISOString();
  return Buffer.from(`${iso},${id}`).toString("base64");
}

/**
 * Decode a cursor string back into its ordering key. Returns `null` for any
 * malformed input so callers can safely fall back to offset pagination rather
 * than throwing on attacker- or bug-supplied cursors.
 */
export function decodeCursor(cursor: string | null | undefined): DecodedCursor | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf8");
    let sep = decoded.lastIndexOf(",");
    if (sep <= 0) {
      sep = decoded.lastIndexOf("|");
    }

    if (sep > 0) {
      const iso = decoded.slice(0, sep);
      const idRaw = decoded.slice(sep + 1);
      const createdAt = new Date(iso);
      const id = Number(idRaw);
      if (Number.isNaN(createdAt.getTime()) || !Number.isInteger(id) || idRaw.trim() === "") {
        return null;
      }
      return { createdAt, timestamp: createdAt, id };
    }

    // Support legacy single-field timestamp cursors without an id component
    const createdAt = new Date(decoded);
    if (!Number.isNaN(createdAt.getTime())) {
      return { createdAt, timestamp: createdAt, id: null };
    }

    return null;
  } catch {
    return null;
  }
}
