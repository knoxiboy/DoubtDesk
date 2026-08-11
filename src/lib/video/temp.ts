import fs from "fs";
import os from "os";
import path from "path";

/**
 * Application-owned temp root. All DoubtDesk temporary assets (audio, video)
 * live under this directory so that:
 *
 * 1. The hourly cleanupTempAssets cron scans ONLY this root — never the
 *    shared os.tmpdir(), eliminating cross-process / cross-job data loss.
 * 2. Each pipeline invocation gets a unique subdirectory, so concurrent
 *    jobs cannot interfere with one another.
 */
export const TEMP_ROOT = path.join(os.tmpdir(), "doubtdesk");

/**
 * Ensure the application temp root exists (idempotent).
 */
export function ensureTempRoot(): string {
  fs.mkdirSync(TEMP_ROOT, { recursive: true });
  return TEMP_ROOT;
}

/**
 * Create a fresh, unique temporary directory under the application temp root.
 * Each call returns a path like  /tmp/doubtdesk/doubtdesk-audio-<random>
 */
export function createAudioTempDir(): string {
  ensureTempRoot();
  return fs.mkdtempSync(path.join(TEMP_ROOT, "doubtdesk-audio-"));
}

/**
 * Return the path for a rendered video file inside the application temp root.
 * The filename incorporates Date.now() for uniqueness.
 */
export function getVideoTempPath(): string {
  ensureTempRoot();
  return path.join(TEMP_ROOT, `video-${Date.now()}.mp4`);
}
