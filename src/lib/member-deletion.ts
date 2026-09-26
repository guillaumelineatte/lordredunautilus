/** Message de confirmation d'une suppression de fiche : ce qui sera réellement effacé. */
export function deleteConfirmation(name: string, membershipCount: number): string {
  return membershipCount > 0
    ? `Supprimer la fiche de ${name} ?\n\nNom, identifiants de jeu, autorisations et documents seront effacés définitivement. ` +
        `Ses ${membershipCount} adhésion(s) restent en comptabilité sous « Ancien membre ».\n\nCette action est irréversible.`
    : `Supprimer définitivement la fiche de ${name} ?\n\nAucune adhésion n'est enregistrée : la fiche sera entièrement effacée.\n\nCette action est irréversible.`;
}
