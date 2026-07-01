import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { currentUser } from "@clerk/nextjs/server";
import { checkUserBlock } from "@/lib/auth-utils";
import { redisClient, videoLimiter } from "@/lib/ratelimit";
import { enforceApiRateLimit } from "@/lib/api-rate-limit";
import { parseAndValidateRequest } from "@/lib/validations/validate";
import { generateVideoSchema } from "@/lib/validations/video";
import { db } from "@/configs/db";
import { videoJobsTable } from "@/configs/schema";
import { inngest } from "@/inngest/client";

/**
 * Submit a video generation job (issue #321).
 *
 * The OCR -> AI script -> TTS -> Remotion render pipeline (30-60s) used to run
 * inline here and exceeded the serverless timeout. It now runs as an Inngest
 * background job: this handler validates, creates a `video_jobs` row, emits the
 * `video/generate.requested` event, and returns a `jobId` immediately. Clients
 * stream progress from GET /api/video/status?jobId=…
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = user.primaryEmailAddress?.emailAddress;
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const rateLimitResponse = await enforceApiRateLimit(videoLimiter, email, "video");
  if (rateLimitResponse) return rateLimitResponse;

  const { isBlocked, errorResponse: blockResponse } = await checkUserBlock(email);
  if (isBlocked) return blockResponse;

  const { errorResponse, data } = await parseAndValidateRequest(req, generateVideoSchema);
  if (errorResponse) return errorResponse;

  // One active generation per user. The background job releases this lock when it
  // finishes (success or failure); a 5-minute TTL guards against leaked locks.
  const lockKey = `video_lock:${user.id}`;
  const lockAcquired = await redisClient.setnx(lockKey, "1");
  if (!lockAcquired || lockAcquired === 0) {
    return NextResponse.json(
      {
        error:
          "A video generation is already in progress for your account. Please wait for it to finish.",
      },
      { status: 429 },
    );
  }
  if (redisClient.expire) {
    await redisClient.expire(lockKey, 300);
  }

  try {
    const { content, imageUrl } = data;

    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host");
    const baseUrl = `${protocol}://${host}`;

    const jobId = randomUUID();
    await db.insert(videoJobsTable).values({
      id: jobId,
      userEmail: email,
      status: "queued",
      progress: 0,
      step: "Queued",
    });

    await inngest.send({
      name: "video/generate.requested",
      data: {
        jobId,
        email,
        content: content ?? null,
        imageUrl: imageUrl ?? null,
        baseUrl,
        lockKey,
      },
    });

    return NextResponse.json({ jobId, status: "queued" }, { status: 202 });
  } catch (error: unknown) {
    // Failed to enqueue → release the lock so the user can retry immediately.
    await redisClient.del(lockKey).catch(() => {});
    console.error("Failed to enqueue video generation:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to start video generation",
      },
      { status: 500 },
    );
  }
}
