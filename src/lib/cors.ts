const allowlist = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const isVercel = (origin: string) =>
  /^https:\/\/[-a-z0-9]+\.vercel\.app$/i.test(origin);

/** Returns the origin if allowed by CORS, null otherwise. No origin (e.g. curl/server-to-server) is allowed. */
export function getAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null; // allow: no Origin header
  if (allowlist.includes(origin) || isVercel(origin)) return origin;
  return null;
}

export const CORS_METHODS = "GET, POST, PUT, DELETE, OPTIONS";
export const CORS_ALLOWED_HEADERS = "Content-Type, Authorization";
