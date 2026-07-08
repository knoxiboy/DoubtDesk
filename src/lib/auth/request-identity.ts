import { isIP } from "node:net";

export function getAnonymousQuotaIdentifier(req: Request): string {
  // x-real-ip is expected to be overwritten by the trusted deployment proxy.
  // Ignore x-forwarded-for because clients can append arbitrary values to it.
  const realIp = req.headers.get("x-real-ip")?.trim();
  return realIp && isIP(realIp) ? `ip:${realIp.toLowerCase()}` : "anonymous";
}
