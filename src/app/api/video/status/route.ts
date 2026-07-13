import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/configs/db";
import { videoJobsTable } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { getVideoSignedUrl } from "@/lib/video/storage";

export const dynamic = "force-dynamic";

/**
 * ── Constants ────────────────────────────────────────────────────────
 */

/** Initial database poll interval (ms). */
const BASE_POLL_MS = 1500;

/** Maximum poll interval (ms) after exponential backoff. */
const MAX_POLL_MS = 15_000;

/** Backoff multiplier applied each time the row hasn't changed. */
const BACKOFF_FACTOR = 2;

/** SSE comment heartbeat interval (ms) — keeps proxies from closing idle connections. */
const HEARTBEAT_MS = 20_000;

/**
 * Hard cap on stream lifetime (ms).
 * Serverless functions have a finite budget; clients should reconnect if needed.
 */
const MAX_STREAM_MS = 4 * 60 * 1000;

/**
 * ── Helpers ──────────────────────────────────────────────────────────
 */

interface JobSnapshot {
  jobId: string;
  status: string;
  progress: number;
  step: string | null;
  videoUrl: string | null;
  videoType: string | null;
  error: string | null;
}

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function badRequest(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

function notFound(): Response {
  return new Response(JSON.stringify({ error: "Job not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * ── SSE Handler ──────────────────────────────────────────────────────
 *
 * GET /api/video/status?jobId=…
 *
 * Streams the job's status/progress to the client using Server-Sent Events.
 * Uses **exponential backoff** on the database poll interval when the row
 * hasn't changed, and sends SSE heartbeat comments every 20 s to prevent
 * proxy timeouts.
 */
export async function GET(req: Request) {
  // ── Auth & validation (before allocating the stream) ───────────────
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) return unauthorized();

  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId) return badRequest("jobId is required");

  const [job] = await db
    .select({ userEmail: videoJobsTable.userEmail })
    .from(videoJobsTable)
    .where(eq(videoJobsTable.id, jobId));
  if (!job || job.userEmail !== email) return notFound();

  // ── Stream setup ───────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let lastSnapshotSerialized = "";
      let lastUpdatedAt: Date | null = null;
      let currentPollMs = BASE_POLL_MS;
      let pollTimer: ReturnType<typeof setTimeout> | null = null;
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
      let streamTimeout: ReturnType<typeof setTimeout> | null = null;

      // ── Cleanup ────────────────────────────────────────────────────
      const cleanup = () => {
        if (pollTimer) clearTimeout(pollTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (streamTimeout) clearTimeout(streamTimeout);
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      };

      const send = (data: string) => {
        if (closed) return;
        controller.enqueue(encoder.encode(data));
      };

      const sendEvent = (event: object) => {
        send(`data: ${JSON.stringify(event)}\n\n`);
      };

      // ── Heartbeat ──────────────────────────────────────────────────
      const startHeartbeat = () => {
        heartbeatTimer = setInterval(() => {
          send(": heartbeat\n\n");
        }, HEARTBEAT_MS);
      };

      // ── Single poll cycle ──────────────────────────────────────────
      // Returns true when a terminal state has been processed.
      const poll = async (): Promise<boolean> => {
        const [row] = await db
          .select()
          .from(videoJobsTable)
          .where(eq(videoJobsTable.id, jobId));

        if (!row) {
          sendEvent({ status: "failed", error: "Job not found" });
          cleanup();
          return true;
        }

        // Build the current snapshot.
        const snapshot: JobSnapshot = {
          jobId: row.id,
          status: row.status,
          progress: row.progress,
          step: row.step,
          videoUrl: row.videoUrl,
          videoType: row.videoType,
          error: row.error,
        };

        if (snapshot.status === "completed" && snapshot.videoUrl) {
          try {
            snapshot.videoUrl = await getVideoSignedUrl(snapshot.videoUrl);
          } catch (err) {
            console.error("Failed to sign video URL:", err);
          }
        }

        const serialized = JSON.stringify(snapshot);

        // ── Change detection ─────────────────────────────────────────
        const rowUpdatedAt = row.updatedAt ? new Date(row.updatedAt) : null;
        const changed =
          serialized !== lastSnapshotSerialized ||
          (rowUpdatedAt &&
            lastUpdatedAt &&
            rowUpdatedAt.getTime() !== lastUpdatedAt.getTime());

        if (changed) {
          sendEvent(snapshot);
          lastSnapshotSerialized = serialized;
          lastUpdatedAt = rowUpdatedAt;
          currentPollMs = BASE_POLL_MS; // reset backoff on change
        } else {
          // Exponential backoff: double the interval, but cap it.
          currentPollMs = Math.min(currentPollMs * BACKOFF_FACTOR, MAX_POLL_MS);
        }

        // Terminal states — close the stream.
        if (row.status === "completed" || row.status === "failed") {
          cleanup();
          return true;
        }

        return false;
      };

      // ── Orchestration loop (recursive setTimeout) ──────────────────
      const scheduleNext = () => {
        if (closed) return;
        pollTimer = setTimeout(async () => {
          try {
            const done = await poll();
            if (!done) scheduleNext();
          } catch {
            sendEvent({ status: "failed", error: "Status stream error" });
            cleanup();
          }
        }, currentPollMs);
      };

      // ── Wire it up ─────────────────────────────────────────────────
      req.signal?.addEventListener?.("abort", cleanup);

      // Emit the current state immediately; stop if already terminal.
      if (await poll()) return;

      startHeartbeat();
      scheduleNext();

      // Hard cap: close the stream after MAX_STREAM_MS.
      streamTimeout = setTimeout(() => {
        sendEvent({ type: "timeout", message: "Status stream closed; reconnect to continue." });
        cleanup();
      }, MAX_STREAM_MS);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
