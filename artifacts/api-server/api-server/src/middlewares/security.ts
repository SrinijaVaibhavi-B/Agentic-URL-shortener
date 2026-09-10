import type { NextFunction, Request, Response } from "express";

interface RateWindow {
  count: number;
  resetAt: number;
}

const windows = new Map<string, RateWindow>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 180;

export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  next();
}

export function rateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const current = windows.get(key);
  const window =
    !current || current.resetAt <= now
      ? { count: 0, resetAt: now + WINDOW_MS }
      : current;
  window.count += 1;
  windows.set(key, window);

  const remaining = Math.max(0, MAX_REQUESTS - window.count);
  res.setHeader("RateLimit-Limit", String(MAX_REQUESTS));
  res.setHeader("RateLimit-Remaining", String(remaining));
  res.setHeader(
    "RateLimit-Reset",
    String(Math.ceil((window.resetAt - now) / 1000)),
  );

  if (window.count > MAX_REQUESTS) {
    res.setHeader("Retry-After", String(Math.ceil(WINDOW_MS / 1000)));
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  if (windows.size > 10_000) {
    for (const [candidate, entry] of windows) {
      if (entry.resetAt <= now) windows.delete(candidate);
    }
  }
  next();
}