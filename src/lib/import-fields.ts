/**
 * Champs importables depuis un CSV : uniquement ceux que l'association a le
 * droit de conserver. Les identifiants de jeu se mappent sur « game:<slug> ».
 */
export const IMPORTABLE_FIELDS = [
  "firstName",
  "lastName",
  "birthYear",
  "isMinor",
  "cardNumber",
  "notes",
] as const;

export const importableFieldLabel: Record<(typeof IMPORTABLE_FIELDS)[number], string> = {
  firstName: "Prénom",
  lastName: "Nom",
  birthYear: "Année de naissance",
  isMinor: "Mineur (oui/non)",
  cardNumber: "Numéro de carte",
  notes: "Notes internes",
};
