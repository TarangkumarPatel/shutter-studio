import crypto from "node:crypto";

/**
 * Best-effort client IP extraction. NextRequest has no reliable `.ip` field
 * once deployed behind a proxy, so we read the standard forwarding headers.
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

/** Never store raw IPs — only a salted hash, purely for soft dedupe/rate-limiting. */
export function hashIp(ip: string): string {
  const salt = process.env.SESSION_SECRET ?? "fallback-salt";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
