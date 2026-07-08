import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/configs/db";
import { videoJobsTable } from "@/configs/schema";
import { eq } from "drizzle-orm";

// Always run dynamically; an SSE stream must never be cached.
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 1500;
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
      let interval: ReturnType<typeof setInterval> | null = null;
      let timeout: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (interval) clearInterval(interval);
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
        const serialized = JSON.stringify(snapshot);
        if (serialized !== lastSerialized) {
          send(snapshot);
          lastSerialized = serialized;
        }

        if (row.status === "completed" || row.status === "failed") {
          cleanup();
          return true;
        }
        return false;
      };

      // Close the stream if the client disconnects.
      req.signal?.addEventListener?.("abort", cleanup);

      // Emit the current state immediately; stop if it's already terminal.
      if (await poll()) return;

      interval = setInterval(() => {
        poll().catch(() => {
          send({ status: "failed", error: "Status stream error" });
          cleanup();
        });
      }, POLL_INTERVAL_MS);

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
