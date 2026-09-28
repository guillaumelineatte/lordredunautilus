// échecs d'affilée avant blocage
export const MAX_FAILED_ATTEMPTS = 5;

// Durée du blocage en minutes. Jamais définitif, sinon n'importe qui pourrait
// bloquer le seul compte admin en se trompant exprès.
export function lockMinutes(failedCount: number): number | null {
  if (failedCount < MAX_FAILED_ATTEMPTS) return null;
  if (failedCount >= MAX_FAILED_ATTEMPTS * 2) return 60;
  return 15;
}

export function lockUntil(failedCount: number, now: Date = new Date()): Date | null {
  const minutes = lockMinutes(failedCount);
  return minutes ? new Date(now.getTime() + minutes * 60_000) : null;
}
