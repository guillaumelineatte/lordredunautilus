// Les champs qu'on peut importer d'un CSV, seulement ce qu'on a le droit de garder.
// Les identifiants de jeu se mappent sur game:<slug>.
export const IMPORTABLE_FIELDS = ["firstName", "lastName", "cardNumber", "notes"] as const;

export const importableFieldLabel: Record<(typeof IMPORTABLE_FIELDS)[number], string> = {
  firstName: "Prénom",
  lastName: "Nom",
  cardNumber: "Numéro de carte",
  notes: "Notes internes",
};
