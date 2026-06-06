import { createHash } from "crypto";
import { NextRequest } from "next/server";

export function requestVisitorHash(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    forwardedFor ||
    "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  return createHash("sha256").update(`${ip}:${userAgent}`).digest("hex");
}

export function analyticsDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function weekStart(date = new Date()) {
  const start = new Date(date);
  const day = start.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setUTCDate(start.getUTCDate() - diff);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}
