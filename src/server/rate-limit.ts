import "server-only";
import { db } from "./db";
import { hashIp } from "./request";

export type RateLimitRule = { limit: number; windowSeconds: number };

export const RULES = {
  contact: { limit: 5, windowSeconds: 3600 },
  registration: { limit: 10, windowSeconds: 3600 },
  cancellation: { limit: 20, windowSeconds: 3600 },
  login: { limit: 10, windowSeconds: 900 },
} satisfies Record<string, RateLimitRule>;

/**
 * Fenêtre fixe stockée en base (fonctionne en serverless, sans Redis).
 * Renvoie true si la requête est autorisée.
 */
export async function rateLimit(scope: keyof typeof RULES, ip: string | null): Promise<boolean> {
  const rule = RULES[scope];
  const windowMs = rule.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const key = `${scope}:${hashIp(ip)}`;

  const hit = await db.rateLimitHit.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  return hit.count <= rule.limit;
}
