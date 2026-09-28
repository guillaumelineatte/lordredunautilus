// Durées de conservation. Utilisées par le cron, la page confidentialité et le registre,
// donc on ne les change qu'ici.
export const RETENTION = {
  memberYears: 3, // après la fin de la dernière adhésion
  trashDays: 30, // corbeille, avant anonymisation
  registrationEmailDays: 7, // mail facultatif d'une inscription, après l'événement
  registrationMonths: 12, // inscriptions, après l'événement
  contactHandledMonths: 6, // message traité
  contactUnhandledMonths: 12, // message jamais traité
  auditMonths: 12,
  rateLimitHours: 24,
} as const;
