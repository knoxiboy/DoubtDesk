import { createHash } from "crypto";

/**
 * Anonymity helpers for doubt/reply author identity.
 *
 * DoubtDesk lets students post doubts and replies under an anonymized identity.
 * The database stores the real author (`userEmail`) so the platform can enforce
 * ownership, moderation, karma and notifications server-side, but that identifier
 * must never reach other users. These helpers produce the only author-facing
 * representation that is safe to serialize into an API response:
 *
 *   - a stable, non-reversible display handle (e.g. "Student_7F3Q2"), and
 *   - an `isOwnPost` boolean computed from the authenticated session.
 *
 * See docs/PRIVACY.md ("Privacy Model") and CONTRIBUTING.md for the rule that
 * raw author identifiers must not cross the API boundary.
 */

const DEFAULT_HANDLE_SALT = "doubtdesk:anon-handle:v1";

/**
 * Per-deployment secret used to salt the author hash. Set ANON_HANDLE_SALT in
 * the environment so handles cannot be pre-computed for a list of candidate
 * emails by anyone who learns the (public) hashing scheme. A stable default is
 * used in development/tests so handles remain deterministic.
 */
function handleSalt(): string {
  const fromEnv = process.env.ANON_HANDLE_SALT;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();

  // Fail closed in production: deriving handles from a public default salt would
  // make them predictable (precomputable from candidate emails), defeating the
  // anonymity guarantee. The deterministic default is allowed only outside
  // production (development/tests) so handles stay stable there.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ANON_HANDLE_SALT must be set in production: refusing to derive anonymous " +
        "author handles with a public default salt.",
    );
  }
  return DEFAULT_HANDLE_SALT;
}

/**
 * Deterministic, non-reversible public display handle for an author.
 *
 * Properties:
 *  - Stable for a given email, so an author's posts/replies read consistently
 *    within a thread (e.g. you can tell the asker's follow-ups apart).
 *  - Salted + SHA-256 hashed, so the email cannot be recovered from the handle,
 *    and handles cannot be brute-forced from candidate emails without the salt.
 *  - Never contains any part of the email address.
 *
 * Returns "Anonymous" when there is no author email.
 */
export function getAnonymousHandle(email?: string | null): string {
  if (!email) return "Anonymous";

  const digest = createHash("sha256")
    .update(`${handleSalt()}:${email.trim().toLowerCase()}`)
    .digest("hex");

  // Use 40 bits of the digest, base36-encoded, for a short readable code.
  const code = parseInt(digest.slice(0, 10), 16)
    .toString(36)
    .toUpperCase()
    .padStart(5, "0")
    .slice(0, 5);

  return `Student_${code}`;
}

/**
 * Single-character avatar initial for an author, derived from the handle rather
 * than the email so the avatar letter can never leak the first character of the
 * address.
 */
export function getAnonymousInitial(email?: string | null): string {
  const handle = getAnonymousHandle(email);
  return handle.replace(/^Student_/, "").charAt(0).toUpperCase() || "A";
}

/**
 * Whether `viewerEmail` is the author identified by `authorEmail`. Comparison is
 * case-insensitive and trimmed to match how emails are stored/normalized across
 * different write paths. Returns false if either side is missing.
 */
export function isOwnAuthor(
  viewerEmail?: string | null,
  authorEmail?: string | null,
): boolean {
  if (!viewerEmail || !authorEmail) return false;
  return viewerEmail.trim().toLowerCase() === authorEmail.trim().toLowerCase();
}

type AuthoredRow = {
  /** Canonical author identifier on doubts/replies. */
  userEmail?: string | null;
  /** Defensive: other identifier shapes that a joined/query-shaped row might carry. */
  authorEmail?: string | null;
  userId?: unknown;
  authorId?: unknown;
  clerkId?: unknown;
  email?: unknown;
  name?: unknown;
  /** pgvector embedding on doubts — internal only, must not be serialized. */
  embedding?: unknown;
  /** soft-delete marker — internal only. */
  deletedAt?: unknown;
};

/**
 * Keys that must never reach a client. Listed explicitly so the public type and
 * the runtime serializer stay in lockstep and a future joined row can't smuggle
 * an identifier through.
 */
type PrivateAuthoredKeys =
  | "userEmail"
  | "authorEmail"
  | "userId"
  | "authorId"
  | "clerkId"
  | "email"
  | "name"
  | "embedding"
  | "deletedAt";

export type PublicAuthored<T> = Omit<T, PrivateAuthoredKeys> & {
  author: string;
  authorInitial: string;
  isOwnPost: boolean;
};

/**
 * Strip author-identifying and internal fields from a doubt/reply row and attach
 * a safe, public author representation. This is the single chokepoint every
 * doubt/reply API response should pass through before being returned to a client.
 *
 * Removed: every key in `PrivateAuthoredKeys` (the real author identifier and its
 * aliases, plus the internal `embedding` and `deletedAt`).
 * Added: `author` (handle), `authorInitial`, `isOwnPost` (session-derived).
 *
 * All other fields (content, tags, likes, hasLiked, replyCount, hasUpvoted, ...)
 * are preserved untouched.
 */
export function toPublicAuthored<T extends AuthoredRow>(
  row: T,
  viewerEmail?: string | null,
): PublicAuthored<T> {
  const {
    userEmail,
    authorEmail,
    userId,
    authorId,
    clerkId,
    email,
    name,
    embedding,
    deletedAt,
    ...safe
  } = row;
  // Reference the stripped values so linters/compilers don't flag them; they are
  // intentionally discarded and never serialized.
  void userId;
  void authorId;
  void clerkId;
  void email;
  void name;
  void embedding;
  void deletedAt;

  const authorIdentity = userEmail ?? authorEmail ?? null;

  return {
    ...(safe as Omit<T, PrivateAuthoredKeys>),
    author: getAnonymousHandle(authorIdentity),
    authorInitial: getAnonymousInitial(authorIdentity),
    isOwnPost: isOwnAuthor(viewerEmail, authorIdentity),
  };
}

/** Intention-revealing alias for serializing a doubt row. */
export const toPublicDoubt = toPublicAuthored;

/** Intention-revealing alias for serializing a reply row. */
export const toPublicReply = toPublicAuthored;
