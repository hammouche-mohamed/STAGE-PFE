/**
 * NFR-S4: In-memory rate limiter for authentication and registration endpoints.
 *
 * Uses a sliding-window counter keyed on the client IP address.
 * On Vercel / serverless the store is per-instance; for production at scale
 * use Redis (e.g. @upstash/ratelimit) as a drop-in replacement.
 */

interface Window {
  count: number;
  start: number;
}

const store = new Map<string, Window>();

/**
 * Returns true when the request should be blocked.
 *
 * @param key      - Typically the client IP (x-forwarded-for or x-real-ip)
 * @param limit    - Max requests allowed in the window (default 10)
 * @param windowMs - Window duration in milliseconds (default 60 000 = 1 min)
 */
export function isRateLimited(
  key: string,
  limit = 10,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.start > windowMs) {
    // New window
    store.set(key, { count: 1, start: now });
    return false;
  }

  entry.count += 1;

  if (entry.count > limit) {
    return true;
  }

  return false;
}

/**
 * Extracts the best-effort client IP from a Next.js Request.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
