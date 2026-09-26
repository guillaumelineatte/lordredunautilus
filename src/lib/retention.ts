/** Durées de conservation : une seule source pour le cron, la page confidentialité et le registre. */
export const RETENTION = {
  /** Fiche adhérent : années après la fin de la dernière adhésion, puis anonymisation. */
  memberYears: 3,
  /** Fiche mise à la corbeille : jours avant anonymisation définitive. */
  trashDays: 30,
  /** E-mail facultatif d'une inscription : jours après l'événement. */
  registrationEmailDays: 7,
  /** Inscriptions aux événements : mois après l'événement. */
  registrationMonths: 12,
  /** Message de contact traité : mois après traitement. */
  contactHandledMonths: 6,
  /** Message de contact jamais traité : mois après réception. */
  contactUnhandledMonths: 12,
  /** Journal d'administration : mois. */
  auditMonths: 12,
  /** Compteurs de limitation de débit : heures. */
  rateLimitHours: 24,
} as const;
