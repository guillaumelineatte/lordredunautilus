import "server-only";
import type { Tx } from "../db";
import type { AuditRecorder } from "../service/audit";
import { fail } from "../service/errors";
import { recomputeMemberStatus } from "./members";

/**
 * Fusion de doublons : tout ce qui appartient à `dropId` passe sur `keepId`,
 * les champs vides de la fiche conservée sont complétés, puis `dropId` est supprimée.
 */
export async function mergeMembers(tx: Tx, keepId: string, dropId: string, audit: AuditRecorder) {
  const [keep, drop] = await Promise.all([
    tx.member.findUnique({ where: { id: keepId }, include: { gameIds: true } }),
    tx.member.findUnique({
      where: { id: dropId },
      include: { gameIds: true, taggedPhotos: { select: { id: true } } },
    }),
  ]);
  if (!keep || !drop) fail("Fiche introuvable.");
  if (keep.anonymizedAt || drop.anonymizedAt)
    fail("Une fiche anonymisée ne peut pas être fusionnée.");

  await tx.membership.updateMany({ where: { memberId: dropId }, data: { memberId: keepId } });

  const keepRegs = await tx.eventRegistration.findMany({
    where: { memberId: keepId },
    select: { eventId: true },
  });
  const keepEvents = new Set(keepRegs.map((r) => r.eventId));
  const dropRegs = await tx.eventRegistration.findMany({ where: { memberId: dropId } });
  for (const r of dropRegs) {
    if (keepEvents.has(r.eventId)) {
      await tx.eventRegistration.update({ where: { id: r.id }, data: { memberId: null } });
    } else {
      await tx.eventRegistration.update({ where: { id: r.id }, data: { memberId: keepId } });
    }
  }

  const keepGames = new Set(keep.gameIds.map((g) => g.gameId));
  for (const g of drop.gameIds) {
    if (keepGames.has(g.gameId)) {
      await tx.memberGameId.delete({ where: { id: g.id } });
    } else {
      await tx.memberGameId.update({ where: { id: g.id }, data: { memberId: keepId } });
    }
  }

  const dropCard = drop.cardNumber;
  const dropFile = drop.parentalDocumentFileId;
  // Libère les valeurs uniques avant de les reporter sur la fiche conservée.
  await tx.member.update({
    where: { id: dropId },
    data: { cardNumber: null, parentalDocumentFileId: null, taggedPhotos: { set: [] } },
  });

  const notes = [keep.notes, drop.notes].filter(Boolean).join(" · ").slice(0, 500) || null;
  const updated = await tx.member.update({
    where: { id: keepId },
    data: {
      isMinor: keep.isMinor || drop.isMinor,
      cardNumber: keep.cardNumber ?? dropCard,
      notes,
      ...(!keep.imageRightsGallery && drop.imageRightsGallery
        ? {
            imageRightsGallery: true,
            imageRightsGalleryAt: drop.imageRightsGalleryAt,
            imageRightsGallerySource: drop.imageRightsGallerySource,
          }
        : {}),
      ...(!keep.imageRightsSocial && drop.imageRightsSocial
        ? {
            imageRightsSocial: true,
            imageRightsSocialAt: drop.imageRightsSocialAt,
            imageRightsSocialSource: drop.imageRightsSocialSource,
          }
        : {}),
      ...(!keep.parentalDocumentReceived && drop.parentalDocumentReceived
        ? {
            parentalDocumentReceived: true,
            parentalDocumentReceivedAt: drop.parentalDocumentReceivedAt,
          }
        : {}),
      parentalDocumentFileId: keep.parentalDocumentFileId ?? dropFile,
      taggedPhotos: { connect: drop.taggedPhotos.map((p) => ({ id: p.id })) },
    },
  });
  if (keep.parentalDocumentFileId && dropFile) {
    await tx.privateFile.delete({ where: { id: dropFile } });
  }

  await tx.member.delete({ where: { id: dropId } });
  await audit.updated("Member", keep, updated);
  await audit.log("DELETE", "Member", dropId, { fusionneeDans: { before: null, after: keepId } });
  await recomputeMemberStatus(tx, keepId, audit);
  return updated;
}
