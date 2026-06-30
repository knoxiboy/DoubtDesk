# Privacy Model

DoubtDesk lets students post doubts and replies under an **anonymized identity**
so they can ask questions without fear or hesitation. This document describes the
anonymity guarantee, what the API does and does not expose, and how the guarantee
is enforced in code.

## Guarantee

> A doubt's or reply's author is identified to other users **only** by an
> anonymized, non-reversible handle. The author's real identifier (their email,
> and any other personal identifier) is **never** sent to other users through the
> API or rendered in any client payload.

The real author is still stored server-side (`doubts.userEmail`,
`replies.userEmail`) because the platform needs it for ownership checks,
moderation, karma, notifications, and classroom access control. That identifier
simply never crosses the API boundary to another user.

## What is exposed vs. hidden

For every doubt and reply returned by the API, clients receive:

| Field           | Meaning                                                              |
| --------------- | ------------------------------------------------------------------- |
| `author`        | Anonymized display handle, e.g. `Student_7F3Q2`.                     |
| `authorInitial` | A single avatar letter derived from the handle (never the email).   |
| `isOwnPost`     | `true` only when the **authenticated viewer** is the author.        |

The following are **never** serialized to clients:

- `userEmail` — the real author identifier.
- `embedding` — the internal pgvector used for duplicate detection.
- `deletedAt` — the internal soft-delete marker.

### The handle

The handle is produced by `getAnonymousHandle(email)` in
[`src/lib/anonymity.ts`](../src/lib/anonymity.ts):

- **Deterministic** — the same author always maps to the same handle, so their
  posts and replies read consistently within a thread (you can tell the asker's
  follow-ups apart from other participants).
- **Non-reversible** — it is the first 40 bits of `SHA-256(salt + ":" + email)`,
  base36-encoded. The email cannot be recovered from the handle.
- **Salted** — the hash is salted with a per-deployment secret
  (`ANON_HANDLE_SALT`), so handles cannot be pre-computed for a list of candidate
  emails by anyone who knows the (public) hashing scheme. A stable default salt is
  used in development and tests so handles remain deterministic.

Because the handle is deterministic, it provides pseudonymity, not unlinkability:
within a classroom an author's posts share one handle. This is intentional for
thread readability and matches the existing classroom-members behavior, which
shows non-privileged viewers a stable per-member handle instead of an email.

### `isOwnPost`

`isOwnPost` is computed **server-side** by comparing the authenticated session's
email against the stored author email. Clients use it to decide whether to show
owner-only controls (edit/delete) and the "(YOU)" indicator. The client never
sees the email it would otherwise need to make that comparison itself.

## Controlled exceptions

The author's real identity is available only server-side and only for legitimate
internal purposes:

- **The author** — sees `isOwnPost: true` for their own content (but still does
  not receive raw emails of *other* users).
- **Moderation** — moderation logs (`moderation_logs`) and the admin moderation
  views intentionally retain author emails for review. This is a privileged,
  authenticated surface, not the anonymous doubt/reply API.
- **Notifications / karma / ownership** — handled server-side using the stored
  email; none of these echo another user's email back to a client.
- **Classroom member lists** — `GET /api/rooms/members` already shows real emails
  only to privileged roles (teacher/co-teacher/admin/owner) and an anonymized
  `Student_<id>` / `Member_<id>` handle to everyone else.

## Where it is enforced

All author-facing serialization goes through a single chokepoint,
`toPublicDoubt` / `toPublicReply` (both aliases of `toPublicAuthored`) in
[`src/lib/anonymity.ts`](../src/lib/anonymity.ts). The following routes pass their
responses through it:

- `GET /api/doubts` (list)
- `GET /api/doubts/[id]` (detail)
- `POST /api/doubts` (create — author's own, still sanitized)
- `GET /api/replies` (list)
- `POST /api/replies` (create — author's own, still sanitized)

The server-rendered permalink page (`app/doubts/[id]/page.tsx`) also sanitizes the
row before passing it to its client component, because props serialized into the
React Server Component payload are visible in the browser.

## Configuration

Set a unique secret salt per deployment:

```bash
ANON_HANDLE_SALT="<a long random string>"
```

If unset, a stable default is used (handles remain deterministic but become
predictable to anyone who knows the scheme — fine for local development, not for
production).

## For contributors

When you add or change a doubt/reply API response, route it through
`toPublicDoubt` / `toPublicReply`. Never return a raw doubt/reply row (or
`getTableColumns(doubtsTable)`) directly to a client — that re-introduces the
`userEmail` leak. See the "API Response Contract" section in
[CONTRIBUTING.md](../CONTRIBUTING.md).
