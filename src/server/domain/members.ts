import "server-only";
import { dayToDbDate, todayParis } from "@/lib/dates";
import { publicationBlockers } from "@/lib/photo-rules";
import { matchesPattern } from "@/lib/text";
import type { Tx } from "../db";
import type { AuditRecorder } from "../service/audit";
import { fail } from "../service/errors";

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

/** Actif s'il existe une adhésion couvrant aujourd'hui ; les suspendus restent suspendus. */
export async function recomputeMemberStatus(
  tx: Tx,
  memberId: string,
  audit: AuditRecorder,
  today: string = todayParis(),
): Promise<void> {
  const member = await tx.member.findUnique({ where: { id: memberId } });
  if (!member || member.status === "SUSPENDED" || member.anonymizedAt) return;
  const current = await tx.membership.count({
    where: {
      memberId,
      startDate: { lte: dayToDbDate(today) },
      endDate: { gte: dayToDbDate(today) },
    },
  });
  const upcoming = await tx.membership.count({
    where: { memberId, startDate: { gt: dayToDbDate(today) } },
  });
  const status = current > 0 || upcoming > 0 ? "ACTIVE" : "EXPIRED";
  if (status !== member.status) {
    const updated = await tx.member.update({ where: { id: memberId }, data: { status } });
    await audit.updated("Member", member, updated);
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
