export const BACK_TO_HOME_LABEL = "Back to Home";

// Official DoubtDesk Discord community invite.
// Configurable via env so maintainers can rotate/update the invite
// without a code change. Falls back to a placeholder if unset or blank.
const rawDiscordUrl = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL?.trim();
export const DISCORD_INVITE_URL =
  rawDiscordUrl && rawDiscordUrl.length > 0
    ? rawDiscordUrl
    : "https://discord.gg/doubtdesk";