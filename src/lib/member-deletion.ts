// Texte de la confirmation avant suppression, selon ce qui sera vraiment effacé.
export function deleteConfirmation(name: string, membershipCount: number): string {
  return membershipCount > 0
    ? `Supprimer la fiche de ${name} ?\n\nNom, identifiants de jeu et autorisations seront effacés définitivement. ` +
        `Ses ${membershipCount} adhésion(s) restent en comptabilité sous « Ancien membre ».\n\nCette action est irréversible.`
    : `Supprimer définitivement la fiche de ${name} ?\n\nAucune adhésion n'est enregistrée : la fiche sera entièrement effacée.\n\nCette action est irréversible.`;
}
