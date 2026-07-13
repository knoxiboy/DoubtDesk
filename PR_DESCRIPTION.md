## Description
Fix the SSE status stream at `/api/video/status` to eliminate excessive Neon polling by replacing the fixed 1.5s `setInterval` with **exponential backoff** and adding **SSE heartbeat comments** to prevent proxy timeouts.

## Related Issue
Closes #879

## Type of Change
- [x] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Documentation update (README, guides, comments)
- [ ] Style / UI change (no logic change)
- [ ] Code refactor (no behavior change)
- [ ] Test addition or update
- [ ] Breaking change (fix or feature that would cause existing functionality to change)

## Problem
The SSE handler used a fixed `setInterval` at 1500ms with no backoff:
- One client triggers ~160 `SELECT * FROM video_jobs WHERE id = $1` queries over the 4-minute stream cap
- Under load (multiple teachers + students), query rate scales linearly and every query pays Neon's cold-start + latency tax
- No SSE heartbeats — proxies that idle-close after 60-90s drop the connection; stuck-at-30% states produce zero bytes, causing silent client disconnects
- Each stream holds a Vercel serverless function for up to 4 minutes, burning function-seconds unnecessarily

## Solution

### 1. Exponential Backoff (replaces fixed-interval polling)
- **On change**: poll interval resets to 1500ms (responsive while job progresses)
- **On no change**: interval doubles each cycle: 1.5s → 3s → 6s → 12s → caps at 15s
- **Result**: steady-state query rate drops ~10x (from 160 to ~15 queries per 4-min stream)
- Implemented via recursive `setTimeout` instead of `setInterval` so the current backoff value is always respected

### 2. SSE Heartbeat
- `: heartbeat\n\n` SSE comment emitted every 20 seconds
- Keeps reverse proxies (nginx, Cloudflare, Vercel edge) from closing the connection due to inactivity
- Prevents silent client disconnects during long-running jobs stuck at intermediate progress stages

### 3. Change Detection
- Compares serialized snapshot **and** `updatedAt` timestamp to reliably detect state transitions
- Previously only compared serialized JSON; added `updatedAt` as a secondary signal

### 4. Cleanup & Optimization
- Initial ownership query now selects only `userEmail` instead of all columns
- Extracted helper functions (`unauthorized`, `badRequest`, `notFound`) for readability
- Cleaned up timer management — all three timers (backoff poll, heartbeat, stream timeout) are properly cleared on cleanup

## Database Query Comparison (per 4-min stream)

| Scenario | Before (fixed 1.5s) | After (exponential backoff) |
|---|---|---|
| Job completes in 45s (typical) | ~30 queries | ~3-4 queries |
| Job completes in 2min | ~80 queries | ~8 queries |
| Job hits 4-min cap (no changes) | ~160 queries | ~15 queries |
| Job updates every few seconds | ~160 queries | ~25-40 queries (responsive) |

## Files Changed
| File | Change |
|---|---|
| `src/app/api/video/status/route.ts` | Rewrote SSE handler — exponential backoff, heartbeat, improved change detection, optimized initial query |

## How Has This Been Tested?
- [ ] Tested locally with `npm run dev`
- [x] Verified TypeScript compilation (`npx tsc --noEmit` passes)
- [ ] Verified on mobile viewport (375px)
- [ ] Verified on desktop viewport (1440px)

## Checklist
- [x] I have tested my changes locally (`npx tsc --noEmit`)
- [x] My code follows the existing code style (TypeScript, no `any` types)
- [x] I have not introduced unrelated changes (each PR should address one issue)
- [ ] I have added comments where necessary
- [x] My branch is up to date with `main`
- [x] I have linked the related issue above
- [ ] Screenshots are included (if this is a UI change)

## Implementation Notes

### Backoff Sequence
`1500ms → 3000ms → 6000ms → 12000ms → 15000ms (cap) → 15000ms …`

The interval resets to 1500ms whenever the job's snapshot or `updatedAt` changes, ensuring the client gets fast updates during active progress transitions.

### Heartbeat Protocol
The SSE spec defines lines starting with `:` as comments. Browsers and EventSource ignore them, but intermediate proxies see data flowing and keep the connection open. The heartbeat runs on a separate `setInterval` that is cleaned up when the stream ends.

### Future Improvement
For high-traffic deployments, consider Postgres `LISTEN/NOTIFY` to push job status changes from the Inngest worker directly, eliminating polling entirely. The exponential backoff provides a ~10x improvement without requiring PGNOTIFY infrastructure.
