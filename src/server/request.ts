import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { env } from "./env";

export type RequestMeta = { ip: string | null; userAgent: string | null };

export function metaFromHeaders(h: Headers): RequestMeta {
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip") || null;
  const ua = h.get("user-agent");
  return { ip, userAgent: ua ? ua.slice(0, 300) : null };
}

export async function requestMeta(): Promise<RequestMeta> {
  return metaFromHeaders(await headers());
}

/** Empreinte non réversible d'une IP de visiteur (jamais stockée en clair). */
export function hashIp(ip: string | null): string {
  return createHmac("sha256", env.IP_HASH_SECRET)
    .update(ip ?? "inconnue")
    .digest("hex")
    .slice(0, 32);
}
