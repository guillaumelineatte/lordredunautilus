import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Clé d'accès à l'administration.
 *
 * L'administration n'est joignable qu'après être passé par l'adresse secrète
 * /acces/<ADMIN_ACCESS_CODE>, qui dépose un cookie signé. Sans ce cookie, toutes
 * les adresses de l'administration ET de l'API de connexion répondent 404,
 * exactement comme une page qui n'existe pas : impossible de trouver la page de
 * connexion ou de tenter des mots de passe sans connaître l'adresse.
 */
export const GATE_COOKIE = "nautilus_acces";
export const ACCESS_PREFIX = "/acces/";
export const GATE_MAX_AGE = 400 * 24 * 3600; // plafond des navigateurs

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Valeur du cookie : dépend du code et du secret, invalide si l'un des deux change. */
export function gateToken(code: string, secret: string): string {
  return createHmac("sha256", secret).update(`admin-gate:${code}`).digest("base64url");
}

export function isValidGate(value: string | undefined, code: string, secret: string): boolean {
  return Boolean(value) && safeEqual(value ?? "", gateToken(code, secret));
}

/** Adresse d'accès complète, affichée à l'administrateur connecté. */
export function adminAccessUrl(siteUrl: string): string | null {
  const code = process.env.ADMIN_ACCESS_CODE;
  return code ? `${siteUrl.replace(/\/$/, "")}${ACCESS_PREFIX}${code}` : null;
}
