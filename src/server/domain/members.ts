import "server-only";
import { dayToDbDate, todayParis } from "@/lib/dates";
import { matchesPattern } from "@/lib/text";
import type { Tx } from "../db";
import type { AuditRecorder } from "../service/audit";
import { fail } from "../service/errors";
import { anonymizeMember } from "./anonymize";

// Remplace les identifiants de jeu du membre (chaque valeur est vérifiée avec la regex du jeu).
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

// Actif s'il a une adhésion en cours ou à venir, désabonné sinon.
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

// À appeler après chaque changement d'adhésion. Un suspendu reste suspendu.
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

export type DeletionMode = "deleted" | "anonymized";

// Pas d'adhésion (doublon, erreur de saisie, fiche de test) : on efface tout.
// Sinon on anonymise, pour que les montants restent en compta sous "Ancien membre".
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
    },
  });
  if (!member || member.anonymizedAt) fail("Fiche introuvable ou déjà supprimée.");

  if (member._count.memberships > 0) {
    await anonymizeMember(tx, memberId, audit, reason);
    await tx.member.update({ where: { id: memberId }, data: { deletedAt: new Date() } });
    return "anonymized";
  }

  // les identifiants de jeu partent en cascade, les inscriptions sont juste détachées
  await tx.member.delete({ where: { id: memberId } });
  const { _count, ...row } = member;
  await audit.deleted("Member", row);
  return "deleted";
}
