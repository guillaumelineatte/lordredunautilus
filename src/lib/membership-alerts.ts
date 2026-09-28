export type AlertTier = 30 | 7 | 0;

// Quel palier d'alerte envoyer, vu les jours restants et ce qui est déjà parti.
// Si un palier a sauté (cron en panne, adhésion saisie en retard), on le
// rattrape au passage suivant.
export function alertTier(
  daysLeft: number,
  sent: { d30: boolean; d7: boolean; d0: boolean },
): AlertTier | null {
  if (daysLeft < 0) return null;
  if (daysLeft === 0) return sent.d0 ? null : 0;
  if (daysLeft <= 7) return sent.d7 ? null : 7;
  if (daysLeft <= 30) return sent.d30 ? null : 30;
  return null;
}

export const alertField = {
  30: "alertD30SentAt",
  7: "alertD7SentAt",
  0: "alertD0SentAt",
} as const satisfies Record<AlertTier, string>;
