/**
 * Shared UI copy constants for offline sync notifications.
 * Centralising these strings avoids duplicated literals across
 * AskDoubt.tsx, DoubtRepliesModal.tsx, and any future consumer.
 */

/** Toast shown when a doubt is saved to the offline queue. */
export const OFFLINE_DOUBT_QUEUED =
    "You're offline. Your doubt has been saved and will post automatically when you reconnect.";

/** Toast shown when a reply is saved to the offline queue. */
export const OFFLINE_REPLY_QUEUED =
    "You're offline. Your reply has been saved and will post automatically when you reconnect.";

/** Badge label rendered on pending-sync doubt cards. */
export const OFFLINE_SYNC_BADGE = "Syncing Offline...";

/** Toast shown when background sync fails due to an expired session. */
export const OFFLINE_SYNC_AUTH_EXPIRED =
    "Your offline posts could not sync — your session has expired. Please sign in again.";
