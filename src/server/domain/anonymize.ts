import "server-only";
import type { Tx } from "../db";
import type { AuditRecorder } from "../service/audit";

export const FORMER_MEMBER = { firstName: "Ancien", lastName: "membre" } as const;

/**
 * Anonymisation d'une fiche (suppression d'une fiche qui a des adhésions, et cron : même code).
 * - identité, carte, notes, droits, identifiants de jeu, scan : effacés ;
 * - inscriptions liées : anonymisées ; photos où il est identifié : dépubliées ;
 * - adhésions : conservées (montant, dates, formule) pour la comptabilité, sans la référence PayPal.
 */
export async function anonymizeMember(
  tx: Tx,
  memberId: string,
  audit: AuditRecorder,
  reason: string,
): Promise<boolean> {
  const member = await tx.member.findUnique({
    where: { id: memberId },
    include: {
      taggedPhotos: { select: { id: true, isPublished: true } },
      registrations: { select: { id: true } },
    },
  });
  if (!member || member.anonymizedAt) return false;

  const publishedIds = member.taggedPhotos.filter((p) => p.isPublished).map((p) => p.id);
  if (publishedIds.length > 0) {
    await tx.photo.updateMany({
      where: { id: { in: publishedIds } },
      data: { isPublished: false, publishedAt: null },
    });
  }

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
      isMinor: false,
      minorReviewedAt: null,
      cardNumber: null,
      notes: null,
      imageRightsGallery: false,
      imageRightsGalleryAt: null,
      imageRightsGallerySource: null,
      imageRightsSocial: false,
      imageRightsSocialAt: null,
      imageRightsSocialSource: null,
      parentalDocumentReceived: false,
      parentalDocumentReceivedAt: null,
      parentalDocumentFileId: null,
      anonymizedAt: new Date(),
      taggedPhotos: { set: [] },
    },
  });

  if (member.parentalDocumentFileId) {
    await tx.privateFile.delete({ where: { id: member.parentalDocumentFileId } });
  }

  await audit.log("ANONYMIZE", "Member", memberId, {
    motif: { before: null, after: reason },
    photosDepubliees: { before: null, after: publishedIds.length },
  });
  return true;
}
