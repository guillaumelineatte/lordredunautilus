export type AlertTier = 30 | 7 | 0;

/**
 * Palier d'alerte à envoyer pour une adhésion non renouvelée, selon le nombre
 * de jours restants et les paliers déjà signalés. Un palier manqué (cron en
 * panne, adhésion saisie tard) est rattrapé au passage suivant.
 */
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
