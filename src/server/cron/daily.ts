import "server-only";
import { revalidateTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { addDays, daysBetween, dayToDbDate, dbDateToDay, todayParis } from "@/lib/dates";
import { formatDay, formatEventDate, formatHour } from "@/lib/format";
import { alertField, alertTier, type AlertTier } from "@/lib/membership-alerts";
import { RETENTION } from "@/lib/retention";
import { fullName } from "@/lib/text";
import { db } from "../db";
import { deleteMember } from "../domain/members";
import { notifyAdmin, siteUrl } from "../mail/send";
import { AuditRecorder } from "../service/audit";

const SYSTEM_META = { ip: null, userAgent: "cron" };
const systemAudit = (client: Parameters<typeof deleteMember>[0] | typeof db) =>
  new AuditRecorder(client, SYSTEM_META, "SYSTEM");

function monthsAgo(n: number, from = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() - n);
  return d;
}

type Report = Record<string, number | string>;

/** Membres dont l'adhésion la plus récente n'a pas été renouvelée. */
async function latestUnrenewedMemberships() {
  return db.membership.findMany({
    where: {
      renewedBy: null,
      member: { deletedAt: null, anonymizedAt: null },
    },
    include: {
      member: { include: { gameIds: { include: { game: { select: { name: true } } } } } },
      plan: { select: { name: true } },
    },
    orderBy: { endDate: "desc" },
  });
}

/** Alertes J-30 / J-7 / J0, une fois par palier ; statut « échu » le lendemain de la fin. */
export async function membershipJob(today = todayParis()): Promise<Report> {
  const all = await latestUnrenewedMemberships();
  // Ne garder que la dernière adhésion de chaque membre
  const latest = new Map<string, (typeof all)[number]>();
  for (const m of all) {
    const current = latest.get(m.memberId);
    if (!current || m.endDate > current.endDate) latest.set(m.memberId, m);
  }

  const tierLabel: Record<AlertTier, string> = {
    30: "dans 30 jours ou moins",
    7: "dans 7 jours ou moins",
    0: "aujourd'hui",
  };
  const toAlert: Record<AlertTier, string[]> = { 30: [], 7: [], 0: [] };
  let alerts = 0;
  for (const m of latest.values()) {
    const left = daysBetween(today, dbDateToDay(m.endDate));
    const tier = alertTier(left, {
      d30: Boolean(m.alertD30SentAt),
      d7: Boolean(m.alertD7SentAt),
      d0: Boolean(m.alertD0SentAt),
    });
    if (tier === null) continue;
    const games = m.member.gameIds.map((g) => g.game.name).join(", ");
    toAlert[tier].push(
      `${fullName(m.member)}${games ? ` (${games})` : ""} — ${m.plan.name}, fin le ${formatDay(m.endDate)}`,
    );
    await db.membership.update({ where: { id: m.id }, data: { [alertField[tier]]: new Date() } });
    alerts++;
  }

  if (alerts > 0) {
    await notifyAdmin(`Adhésions à renouveler (${alerts})`, {
      title: "Adhésions à renouveler",
      intro:
        "Ces adhésions arrivent à échéance. Pensez à prévenir les membres en personne ou sur Discord.",
      sections: ([0, 7, 30] as const)
        .map((t) => ({ heading: `Fin ${tierLabel[t]}`, items: toAlert[t] }))
        .filter((s) => s.items.length > 0),
      cta: { label: "Ouvrir le tableau de bord", href: siteUrl("/admin") },
    });
  }

  // Passage à « échu » : actifs sans adhésion couvrant aujourd'hui ni à venir.
  const expired = await db.member.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      anonymizedAt: null,
      memberships: { some: {}, none: { endDate: { gte: dayToDbDate(today) } } },
    },
  });
  const audit = systemAudit(db);
  for (const member of expired) {
    const after = await db.member.update({ where: { id: member.id }, data: { status: "EXPIRED" } });
    await audit.updated("Member", member, after);
  }
  if (expired.length > 0) revalidateTag(TAGS.stats, "max");

  return { alertes: alerts, passesEchus: expired.length };
}

/** Événements passés → terminés ; e-mails d'inscription effacés ; vieilles inscriptions supprimées. */
export async function eventsJob(now = new Date()): Promise<Report> {
  const finished = await db.event.updateMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { endsAt: { lt: now } },
        { endsAt: null, startsAt: { lt: new Date(now.getTime() - 6 * 3600_000) } },
      ],
    },
    data: { status: "COMPLETED" },
  });

  const emailCutoff = new Date(now.getTime() - RETENTION.registrationEmailDays * 86_400_000);
  const erased = await db.eventRegistration.updateMany({
    where: { email: { not: null }, event: { startsAt: { lt: emailCutoff } } },
    data: { email: null, cancelTokenHash: null },
  });

  const purged = await db.eventRegistration.deleteMany({
    where: { event: { startsAt: { lt: monthsAgo(RETENTION.registrationMonths, now) } } },
  });

  if (finished.count > 0) revalidateTag(TAGS.events, "max");
  if (finished.count > 0 || erased.count > 0 || purged.count > 0) {
    await systemAudit(db).log("UPDATE", "System", null, {
      evenementsTermines: { before: null, after: finished.count },
      emailsInscriptionEffaces: { before: null, after: erased.count },
      inscriptionsSupprimees: { before: null, after: purged.count },
    });
  }
  return {
    evenementsTermines: finished.count,
    emailsEffaces: erased.count,
    inscriptionsSupprimees: purged.count,
  };
}

/** Messages, anonymisation automatique, corbeille, journal, compteurs. */
export async function retentionJob(now = new Date(), today = todayParis()): Promise<Report> {
  const handled = await db.contactMessage.deleteMany({
    where: { status: "HANDLED", handledAt: { lt: monthsAgo(RETENTION.contactHandledMonths, now) } },
  });
  const stale = await db.contactMessage.deleteMany({
    where: { status: "NEW", createdAt: { lt: monthsAgo(RETENTION.contactUnhandledMonths, now) } },
  });

  // Fin de conservation : dernière adhésion terminée depuis plus de 3 ans, fiche sans
  // adhésion créée il y a plus de 3 ans, corbeille de plus de 30 jours. Même règle que
  // le bouton « Supprimer » : effacement complet sans adhésion, anonymisation sinon.
  const limitDay = addDays(today, -365 * RETENTION.memberYears);
  const candidates = await db.member.findMany({
    where: {
      anonymizedAt: null,
      OR: [
        { memberships: { some: {}, none: { endDate: { gte: dayToDbDate(limitDay) } } } },
        { memberships: { none: {} }, createdAt: { lt: dayToDbDate(limitDay) } },
        { deletedAt: { lt: new Date(now.getTime() - RETENTION.trashDays * 86_400_000) } },
      ],
    },
    select: { id: true, deletedAt: true },
  });
  let anonymized = 0;
  let deleted = 0;
  for (const c of candidates) {
    const mode = await db.$transaction((tx) =>
      deleteMember(
        tx,
        c.id,
        systemAudit(tx),
        c.deletedAt
          ? "Corbeille : 30 jours écoulés"
          : `Plus de ${RETENTION.memberYears} ans sans adhésion`,
      ),
    );
    if (mode === "anonymized") anonymized++;
    else deleted++;
  }

  const audit = await db.auditLog.deleteMany({
    where: { createdAt: { lt: monthsAgo(RETENTION.auditMonths, now) } },
  });
  const rate = await db.rateLimitHit.deleteMany({
    where: { windowStart: { lt: new Date(now.getTime() - RETENTION.rateLimitHours * 3600_000) } },
  });
  const sessions = await db.adminSession.deleteMany({ where: { expiresAt: { lt: now } } });

  if (anonymized + deleted > 0) {
    revalidateTag(TAGS.stats, "max");
    revalidateTag(TAGS.photos, "max");
  }
  if (handled.count + stale.count > 0) {
    await systemAudit(db).log("DELETE", "ContactMessage", null, {
      messagesSupprimes: { before: null, after: handled.count + stale.count },
    });
  }
  return {
    messagesSupprimes: handled.count + stale.count,
    fichesAnonymisees: anonymized,
    fichesSupprimees: deleted,
    journalPurge: audit.count,
    compteursPurges: rate.count,
    sessionsExpirees: sessions.count,
  };
}

/** Digest quotidien : à renouveler ce mois-ci, inscriptions de la veille. */
export async function digestJob(now = new Date(), today = todayParis()): Promise<Report> {
  const monthEnd = addDays(`${today.slice(0, 7)}-01`, 40).slice(0, 7) + "-01";
  const toRenew = await db.membership.findMany({
    where: {
      renewedBy: null,
      endDate: { gte: dayToDbDate(today), lt: dayToDbDate(monthEnd) },
      member: { deletedAt: null, anonymizedAt: null },
    },
    include: { member: true },
    orderBy: { endDate: "asc" },
  });
  const since = new Date(now.getTime() - 86_400_000);
  const registrations = await db.eventRegistration.findMany({
    where: { createdAt: { gte: since }, source: "PUBLIC", event: { deletedAt: null } },
    include: { event: true },
    orderBy: { createdAt: "asc" },
  });
  const unread = await db.contactMessage.count({ where: { status: "NEW" } });

  if (toRenew.length === 0 && registrations.length === 0 && unread === 0)
    return { digest: "rien à envoyer" };

  await notifyAdmin(`Le point du jour — ${formatDay(today)}`, {
    title: "Le point du jour",
    sections: [
      {
        heading: "À renouveler ce mois-ci",
        items: toRenew.map((m) => `${fullName(m.member)} — fin le ${formatDay(m.endDate)}`),
        empty: "Aucune adhésion n'arrive à échéance ce mois-ci.",
      },
      {
        heading: "Inscriptions d'hier",
        items: registrations.map(
          (r) =>
            `${fullName(r)} — ${r.event.title} (${formatEventDate(r.event.startsAt)}, ${formatHour(r.event.startsAt)})${r.status === "WAITLISTED" ? " — liste d'attente" : ""}`,
        ),
        empty: "Aucune nouvelle inscription.",
      },
      {
        heading: "Messages",
        items: unread > 0 ? [`${unread} message(s) non traité(s)`] : [],
        empty: "Boîte de réception à jour.",
      },
    ],
    cta: { label: "Ouvrir l'administration", href: siteUrl("/admin") },
  });
  return { aRenouveler: toRenew.length, inscriptionsVeille: registrations.length };
}

export const JOBS = {
  adhesions: membershipJob,
  evenements: eventsJob,
  conservation: retentionJob,
  digest: digestJob,
} as const;

/** Exécute toutes les tâches, chacune tracée dans CronRun, sans qu'un échec bloque les suivantes. */
export async function runDailyJobs(): Promise<Record<string, Report | { erreur: string }>> {
  const results: Record<string, Report | { erreur: string }> = {};
  for (const [name, job] of Object.entries(JOBS)) {
    const run = await db.cronRun.create({ data: { job: name } });
    try {
      const report = await job();
      results[name] = report;
      await db.cronRun.update({
        where: { id: run.id },
        data: { finishedAt: new Date(), ok: true, report },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[cron:${name}]`, error);
      results[name] = { erreur: message };
      await db.cronRun.update({
        where: { id: run.id },
        data: { finishedAt: new Date(), ok: false, report: { erreur: message } },
      });
    }
  }
  return results;
}
