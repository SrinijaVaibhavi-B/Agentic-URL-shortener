import { isIP } from "node:net";

export const RESERVED_SLUGS = new Set([
  "api",
  "admin",
  "health",
  "sign-in",
  "sign-up",
  "architecture",
  "analytics",
  "audit",
  "runs",
  "urls",
]);

function isPrivateIpv4(hostname: string) {
  const [a, b] = hostname.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

export function validateDestination(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Destination must use HTTP or HTTPS");
  }
  if (url.username || url.password) {
    throw new Error("Destination may not contain embedded credentials");
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const ipVersion = isIP(hostname);
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    (ipVersion === 4 && isPrivateIpv4(hostname)) ||
    (ipVersion === 6 &&
      (hostname === "::1" ||
        hostname.startsWith("fc") ||
        hostname.startsWith("fd") ||
        hostname.startsWith("fe80")))
  ) {
    throw new Error("Private and local destinations are not allowed");
  }
  return url.toString();
}

export function normalizeCustomSlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  if (!normalized || normalized !== value.toLowerCase()) {
    throw new Error(
      "Custom slug may contain lowercase letters, numbers, and hyphens only",
    );
  }
  if (RESERVED_SLUGS.has(normalized)) {
    throw new Error("That slug is reserved");
  }
  return normalized;
}