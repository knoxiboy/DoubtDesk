import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Bucket that holds rendered videos. Override with SUPABASE_VIDEO_BUCKET.
const VIDEO_BUCKET = process.env.SUPABASE_VIDEO_BUCKET || "videos";

// How long generated video signed URLs remain valid (1 hour).
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function uploadVideo(
  localPath: string,
  objectName: string,
): Promise<string> {
  const supabase = getStorageClient();
  if (!supabase) {
    throw new Error(
      "Video generation requires Supabase Storage. Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

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

  return objectName;
}

export async function getVideoSignedUrl(objectName: string): Promise<string> {
  const supabase = getStorageClient();
  if (!supabase) {
    throw new Error(
      "Video streaming requires Supabase Storage. Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const { data, error: signError } = await supabase.storage
    .from(VIDEO_BUCKET)
    .createSignedUrl(objectName, SIGNED_URL_EXPIRY_SECONDS);

  if (signError || !data?.signedUrl) {
    throw new Error(
      `Failed to create signed URL for video${signError ? `: ${signError.message}` : ""}`,
    );
  }

  return data.signedUrl;
}