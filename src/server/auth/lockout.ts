/** Nombre d'échecs consécutifs avant verrouillage. */
export const MAX_FAILED_ATTEMPTS = 5;

/**
 * Durée du verrouillage (en minutes) après `failedCount` échecs consécutifs.
 * Temporaire : un verrouillage définitif permettrait à n'importe qui de
 * bloquer l'unique compte administrateur.
 */
export function lockMinutes(failedCount: number): number | null {
  if (failedCount < MAX_FAILED_ATTEMPTS) return null;
  if (failedCount >= MAX_FAILED_ATTEMPTS * 2) return 60;
  return 15;
}

export function lockUntil(failedCount: number, now: Date = new Date()): Date | null {
  const minutes = lockMinutes(failedCount);
  return minutes ? new Date(now.getTime() + minutes * 60_000) : null;
}
