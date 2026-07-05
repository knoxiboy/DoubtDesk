import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Bucket that holds rendered videos. Override with SUPABASE_VIDEO_BUCKET.
const VIDEO_BUCKET = process.env.SUPABASE_VIDEO_BUCKET || "videos";

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer a service-role key for server-side writes; fall back to the anon key
  // (which requires a public bucket / permissive insert policy).
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Upload a rendered video file to durable object storage (Supabase Storage) and
 * return its public URL (issue #321).
 *
 * Returns `null` when storage isn't configured, so callers can fall back to a
 * local/ephemeral path in development. Throws if an upload is attempted and fails.
 */
export async function uploadVideo(
  localPath: string,
  objectName: string,
): Promise<string | null> {
  const supabase = getStorageClient();
  if (!supabase) return null;

  const fileBuffer = await fs.promises.readFile(localPath);
  const { error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .upload(objectName, fileBuffer, {
      contentType: "video/mp4",
      upsert: true,
    });
  if (error) {
    throw new Error(`Video upload to storage failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(objectName);
  return data.publicUrl;
}