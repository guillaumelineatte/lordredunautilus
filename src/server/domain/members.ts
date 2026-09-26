import "server-only";
import { dayToDbDate, todayParis } from "@/lib/dates";
import { publicationBlockers } from "@/lib/photo-rules";
import { matchesPattern } from "@/lib/text";
import type { Tx } from "../db";
import type { AuditRecorder } from "../service/audit";
import { fail } from "../service/errors";
import { anonymizeMember } from "./anonymize";

/** Remplace les identifiants de jeu d'un adhérent, chaque valeur étant validée par la regex du jeu. */
export async function syncGameIds(
  tx: Tx,
  memberId: string,
  entries: { gameId: string; value: string }[],
  audit: AuditRecorder,
): Promise<void> {
  const games = await tx.game.findMany({
    where: { id: { in: entries.map((e) => e.gameId) } },
    select: {
      id: true,
      name: true,
      playerIdLabel: true,
      playerIdPattern: true,
      playerIdExample: true,
    },
  });
  const byId = new Map(games.map((g) => [g.id, g]));
  for (const e of entries) {
    const game = byId.get(e.gameId);
    if (!game) fail("Jeu inconnu.");
    if (!matchesPattern(e.value, game.playerIdPattern)) {
      fail(
        `${game.playerIdLabel} invalide pour ${game.name}${game.playerIdExample ? ` (exemple : ${game.playerIdExample})` : ""}.`,
        { gameIds: `${game.playerIdLabel} invalide.` },
      );
    }
  }

  const existing = await tx.memberGameId.findMany({ where: { memberId } });
  const wanted = new Map(entries.map((e) => [e.gameId, e.value]));

  for (const row of existing) {
    const value = wanted.get(row.gameId);
    if (value === undefined) {
      await tx.memberGameId.delete({ where: { id: row.id } });
      await audit.deleted("MemberGameId", row);
    } else if (value !== row.value) {
      const updated = await tx.memberGameId.update({ where: { id: row.id }, data: { value } });
      await audit.updated("MemberGameId", row, updated);
    }
    wanted.delete(row.gameId);
  }
  for (const [gameId, value] of wanted) {
    const clash = await tx.memberGameId.findUnique({
      where: { gameId_value: { gameId, value } },
      select: { memberId: true },
    });
    if (clash) {
      fail("Cet identifiant de jeu appartient déjà à une autre fiche : fusionnez les doublons.", {
        gameIds: "Identifiant déjà utilisé par une autre fiche.",
      });
    }
    const created = await tx.memberGameId.create({ data: { memberId, gameId, value } });
    await audit.created("MemberGameId", created);
  }
}

/** Statut déduit des adhésions : actif si une adhésion couvre aujourd'hui ou est à venir. */
export async function membershipStatus(
  tx: Tx,
  memberId: string,
  today: string = todayParis(),
): Promise<"ACTIVE" | "EXPIRED"> {
  const active = await tx.membership.count({
    where: { memberId, endDate: { gte: dayToDbDate(today) } },
  });
  return active > 0 ? "ACTIVE" : "EXPIRED";
}

/** Recalcule le statut après un changement d'adhésion ; les suspendus restent suspendus. */
export async function recomputeMemberStatus(
  tx: Tx,
  memberId: string,
  audit: AuditRecorder,
  today: string = todayParis(),
): Promise<void> {
  const member = await tx.member.findUnique({ where: { id: memberId } });
  if (!member || member.status === "SUSPENDED" || member.anonymizedAt) return;
  const status = await membershipStatus(tx, memberId, today);
  if (status !== member.status) {
    const updated = await tx.member.update({ where: { id: memberId }, data: { status } });
    await audit.updated("Member", member, updated);
  }
}

/** Numéro de carte : unique, avec un message qui dit à qui il est attribué. */
export async function assertCardNumberFree(tx: Tx, cardNumber: string | null, memberId?: string) {
  if (!cardNumber) return;
  const holder = await tx.member.findUnique({
    where: { cardNumber },
    select: { id: true, firstName: true, lastName: true },
  });
  if (holder && holder.id !== memberId) {
    fail(
      `Le numéro de carte ${cardNumber} est déjà attribué à ${holder.firstName} ${holder.lastName}.`,
      {
        cardNumber: "Numéro déjà attribué.",
      },
    );
  }
}

/**
 * Après un changement d'autorisation, dépublie les photos où l'adhérent est
 * identifié et qui ne respectent plus les règles de publication.
 */
export async function enforcePhotoRules(
  tx: Tx,
  memberId: string,
  audit: AuditRecorder,
): Promise<number> {
  const photos = await tx.photo.findMany({
    where: { isPublished: true, deletedAt: null, taggedMembers: { some: { id: memberId } } },
    include: { taggedMembers: true },
  });
  let unpublished = 0;
  for (const photo of photos) {
    if (publicationBlockers(photo).length > 0) {
      const updated = await tx.photo.update({
        where: { id: photo.id },
        data: { isPublished: false, publishedAt: null },
      });
      await audit.updated("Photo", photo, updated);
      unpublished++;
    }
  }
  return unpublished;
}

export type DeletionMode = "deleted" | "anonymized";

/**
 * Suppression d'une fiche depuis l'administration :
 * - sans aucune adhésion (erreur de saisie, doublon, test) : effacement définitif ;
 * - avec des adhésions : anonymisation, les montants restant en comptabilité
 *   sous « Ancien membre ».
 */
export async function deleteMember(
  tx: Tx,
  memberId: string,
  audit: AuditRecorder,
  reason: string,
): Promise<DeletionMode> {
  const member = await tx.member.findUnique({
    where: { id: memberId },
    include: {
      _count: { select: { memberships: true } },
      taggedPhotos: { select: { id: true, isPublished: true } },
    },
  });
  if (!member || member.anonymizedAt) fail("Fiche introuvable ou déjà supprimée.");

  if (member._count.memberships > 0) {
    await anonymizeMember(tx, memberId, audit, reason);
    await tx.member.update({ where: { id: memberId }, data: { deletedAt: new Date() } });
    return "anonymized";
  }

  // Les photos où la personne était identifiée repassent en brouillon, à revérifier.
  const published = member.taggedPhotos.filter((p) => p.isPublished).map((p) => p.id);
  if (published.length > 0) {
    await tx.photo.updateMany({
      where: { id: { in: published } },
      data: { isPublished: false, publishedAt: null },
    });
  }
  // Identifiants de jeu supprimés en cascade, inscriptions détachées, étiquettes photo retirées.
  await tx.member.delete({ where: { id: memberId } });
  if (member.parentalDocumentFileId) {
    await tx.privateFile.delete({ where: { id: member.parentalDocumentFileId } });
  }
  const { _count, taggedPhotos: _photos, ...row } = member;
  await audit.deleted("Member", row);
  return "deleted";
}
