import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/configs/db";
import { videoJobsTable } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { getVideoSignedUrl } from "@/lib/video/storage";

// Always run dynamically; an SSE stream must never be cached.
export const dynamic = "force-dynamic";

const INITIAL_POLL_INTERVAL_MS = 1500;
const MAX_POLL_INTERVAL_MS = 15_000;
// Send a comment frame periodically so idle intermediaries don't drop the
// stream while the job is stuck at a single progress value.
const HEARTBEAT_INTERVAL_MS = 20_000;
// Cap the stream so it can't outlive the serverless function budget. Clients
// should reconnect (EventSource does so automatically) if they hit this.
const MAX_STREAM_MS = 4 * 60 * 1000;

interface JobSnapshot {
  jobId: string;
  status: string;
  progress: number;
  step: string | null;
  videoUrl: string | null;
  videoType: string | null;
  error: string | null;
}

/**
 * Stream video generation progress (issue #321) as Server-Sent Events.
 *
 * GET /api/video/status?jobId=… emits a `data:` event whenever the job's
 * status/progress changes and closes the stream once the job is `completed` or
 * `failed`. Only the job's owner may read it.
 */
export async function GET(req: Request) {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const jobId = new URL(req.url).searchParams.get("jobId");
  if (!jobId) {
    return new Response(JSON.stringify({ error: "jobId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify the job exists and belongs to this user before opening the stream.
  const [job] = await db
    .select()
    .from(videoJobsTable)
    .where(eq(videoJobsTable.id, jobId));
  if (!job || job.userEmail !== email) {
    return new Response(JSON.stringify({ error: "Job not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let lastSerialized = "";
      let pollTimer: ReturnType<typeof setTimeout> | null = null;
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
      let timeout: ReturnType<typeof setTimeout> | null = null;
      let currentPollInterval = INITIAL_POLL_INTERVAL_MS;

      const cleanup = () => {
        if (pollTimer) clearTimeout(pollTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (timeout) clearTimeout(timeout);
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      };

      const send = (event: object) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const sendHeartbeat = () => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          cleanup();
        }
      };

      // Returns true once a terminal state has been emitted and the stream closed.
      const poll = async (): Promise<boolean> => {
        const [row] = await db
          .select()
          .from(videoJobsTable)
          .where(eq(videoJobsTable.id, jobId));

        if (!row) {
          send({ status: "failed", error: "Job not found" });
          cleanup();
          return true;
        }

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
            // keep stored object key; client will see a broken link rather than no status
          }
        }

        const serialized = JSON.stringify(snapshot);
        if (serialized !== lastSerialized) {
          send(snapshot);
          lastSerialized = serialized;
          // Row changed — reset the backoff so we stay responsive during
          // rapid transitions (queued → OCR → script → TTS → render).
          currentPollInterval = INITIAL_POLL_INTERVAL_MS;
        } else {
          // Nothing changed — back off exponentially up to the ceiling. In
          // steady state this cuts Neon query load ~10x vs the old fixed
          // 1.5s cadence.
          currentPollInterval = Math.min(
            currentPollInterval * 2,
            MAX_POLL_INTERVAL_MS,
          );
        }

        if (row.status === "completed" || row.status === "failed") {
          cleanup();
          return true;
        }
        return false;
      };

      const schedulePoll = () => {
        if (closed) return;
        pollTimer = setTimeout(async () => {
          try {
            const terminal = await poll();
            if (!terminal) schedulePoll();
          } catch {
            send({ status: "failed", error: "Status stream error" });
            cleanup();
          }
        }, currentPollInterval);
      };

      // Close the stream if the client disconnects.
      req.signal?.addEventListener?.("abort", cleanup);

      // Emit the current state immediately; stop if it's already terminal.
      if (await poll()) return;

      schedulePoll();

      heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

      timeout = setTimeout(() => {
        send({ type: "timeout", message: "Status stream closed; reconnect to continue." });
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
