import "server-only";
import type { Tx } from "../db";
import type { AuditRecorder } from "../service/audit";

export const FORMER_MEMBER = { firstName: "Ancien", lastName: "membre" } as const;

// Même code pour le bouton supprimer et pour le cron.
// On efface identité, carte, notes, autorisations photo et identifiants de jeu,
// on anonymise les inscriptions liées, et on garde les adhésions pour la compta
// (montant, dates, formule) mais sans la référence PayPal.
export async function anonymizeMember(
  tx: Tx,
  memberId: string,
  audit: AuditRecorder,
  reason: string,
): Promise<boolean> {
  const member = await tx.member.findUnique({
    where: { id: memberId },
    include: { registrations: { select: { id: true } } },
  });
  if (!member || member.anonymizedAt) return false;

  await tx.memberGameId.deleteMany({ where: { memberId } });
  await tx.membership.updateMany({ where: { memberId }, data: { transactionRef: null } });

  for (const reg of member.registrations) {
    await tx.eventRegistration.update({
      where: { id: reg.id },
      data: {
        ...FORMER_MEMBER,
        dedupeKey: `ancien-membre-${reg.id}`,
        playerId: null,
        email: null,
        cancelTokenHash: null,
      },
    });
  }

  await tx.member.update({
    where: { id: memberId },
    data: {
      ...FORMER_MEMBER,
      cardNumber: null,
      notes: null,
      imageRightsGallery: false,
      imageRightsGalleryAt: null,
      imageRightsGallerySource: null,
      imageRightsSocial: false,
      imageRightsSocialAt: null,
      imageRightsSocialSource: null,
      anonymizedAt: new Date(),
    },
  });

  await audit.log("ANONYMIZE", "Member", memberId, {
    motif: { before: null, after: reason },
  });
  return true;
}
