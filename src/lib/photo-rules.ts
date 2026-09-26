import type { ConsentSource } from "@/generated/prisma/enums";

export type TaggedMember = {
  firstName: string;
  lastName: string;
  isMinor: boolean;
  imageRightsGallery: boolean;
  imageRightsGallerySource: ConsentSource | null;
  anonymizedAt: Date | string | null;
};

export type PublishablePhoto = {
  alt: string;
  imageRightsChecked: boolean;
  taggedMembers: TaggedMember[];
};

/**
 * Raisons qui bloquent la publication d'une photo (tableau vide = publiable).
 * - droits à l'image vérifiés (case obligatoire) ;
 * - chaque membre identifié a autorisé la galerie ;
 * - un mineur identifié doit avoir une autorisation parentale papier signée.
 */
export function publicationBlockers(photo: PublishablePhoto): string[] {
  const reasons: string[] = [];
  if (!photo.alt.trim()) reasons.push("Ajoutez un texte alternatif décrivant la photo.");
  if (!photo.imageRightsChecked) reasons.push("Cochez « Droits à l'image vérifiés ».");
  for (const m of photo.taggedMembers) {
    const name = m.anonymizedAt ? "Un ancien membre" : `${m.firstName} ${m.lastName}`;
    if (m.anonymizedAt) {
      reasons.push(`${name} est identifié : retirez-le de la photo ou ne la publiez pas.`);
      continue;
    }
    if (!m.imageRightsGallery) {
      reasons.push(`${name} n'a pas autorisé la publication dans la galerie.`);
    } else if (m.isMinor && m.imageRightsGallerySource !== "SIGNED_PAPER") {
      reasons.push(
        `${name} est mineur : l'autorisation doit venir d'un papier signé par un responsable légal.`,
      );
    }
  }
  return reasons;
}
