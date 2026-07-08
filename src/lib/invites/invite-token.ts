import crypto from "crypto";

export function generateInviteToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getInviteExpiry(hours = 168) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
