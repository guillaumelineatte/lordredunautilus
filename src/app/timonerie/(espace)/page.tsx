import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, Stat } from "@/components/admin/ui";
import { daysBetween, dbDateToDay, todayParis } from "@/lib/dates";
import { formatDateTime, formatDay, formatEventDate, formatHour } from "@/lib/format";
import { auditActionLabel, entityLabel, registrationStatusLabel } from "@/lib/labels";
import { fullName } from "@/lib/text";
import { dashboardData } from "@/server/queries/admin";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const d = await dashboardData();
  const today = todayParis();
  const cronLate = d.cronLate;

  return (
    <>
      <PageHeader
        kicker="Administration"
        title="Tableau de bord"
        description={`Aujourd'hui : ${formatDay(today)}.`}
      />

      {cronLate ? (
        <p className="mb-6 rounded-m border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          Les tâches quotidiennes (alertes, anonymisation, purges) n&apos;ont pas tourné depuis plus
          de 36 heures
          {d.lastCron ? ` (dernier passage : ${formatDateTime(d.lastCron.startedAt)})` : ""}.
          Vérifiez la configuration du cron (voir README).
        </p>
      ) : null}

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Adhésions à renouveler (30 j)"
          value={d.expiring.length}
          tone={d.expiring.length ? "warn" : undefined}
        />
        <Stat label="Échues non renouvelées (3 mois)" value={d.expiredRecently.length} />
        <Stat label="Inscriptions du jour" value={d.todayRegs.length} />
        <Stat label="Messages non traités" value={d.unread} tone={d.unread ? "rose" : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Adhésions expirant sous 30 jours">
          {d.expiring.length === 0 ? (
            <EmptyState>
              Aucune adhésion n&apos;arrive à échéance dans les 30 prochains jours.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {d.expiring.map((m) => {
                const left = daysBetween(today, dbDateToDay(m.endDate));
                return (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <Link href={`/timonerie/adherents/${m.memberId}`} className="hover:text-rose">
                        {fullName(m.member)}
                      </Link>
                      <p className="text-xs text-ivory-3">
                        {m.member.gameIds.map((g) => g.game.name).join(", ") ||
                          "Aucun jeu renseigné"}{" "}
                        · {m.plan.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p>{formatDay(m.endDate)}</p>
                      <Badge tone={left <= 7 ? "danger" : "warn"}>
                        {left === 0 ? "aujourd'hui" : `J-${left}`}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Échues depuis moins de 3 mois, non renouvelées">
          {d.expiredRecently.length === 0 ? (
            <EmptyState>Rien à relancer.</EmptyState>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {d.expiredRecently.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <Link href={`/timonerie/adherents/${m.memberId}`} className="hover:text-rose">
                      {fullName(m.member)}
                    </Link>
                    <p className="text-xs text-ivory-3">
                      {m.member.gameIds.map((g) => g.game.name).join(", ") || "—"}
                    </p>
                  </div>
                  <span className="text-ivory-2">fin le {formatDay(m.endDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Remplissage des prochains événements">
          {d.upcoming.length === 0 ? (
            <EmptyState>Aucun événement publié à venir.</EmptyState>
          ) : (
            <ul className="grid gap-3 text-sm">
              {d.upcoming.map((e) => {
                const taken = e._count.registrations;
                const pct = e.capacity
                  ? Math.min(100, Math.round((taken / e.capacity) * 100))
                  : null;
                return (
                  <li key={e.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <Link href={`/timonerie/evenements/${e.id}`} className="hover:text-rose">
                        {e.title}
                      </Link>
                      <span className="text-xs text-ivory-3">
                        {formatEventDate(e.startsAt)}, {formatHour(e.startsAt)}
                      </span>
                    </div>
                    {pct === null ? (
                      <p className="text-xs text-ivory-3">
                        {e.type === "OPEN_PLAY"
                          ? "Sans inscription"
                          : `${taken} inscrit(s), sans limite`}
                      </p>
                    ) : (
                      <div className="mt-1 flex items-center gap-2">
                        <div
                          className="h-1.5 flex-1 overflow-hidden rounded-full bg-abyss"
                          role="img"
                          aria-label={`${pct} % de remplissage`}
                        >
                          <div
                            className={pct >= 100 ? "h-full bg-rose" : "h-full bg-brass"}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-20 text-right text-xs text-ivory-2">
                          {taken}/{e.capacity}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Inscriptions du jour">
          {d.todayRegs.length === 0 ? (
            <EmptyState>Pas encore d&apos;inscription aujourd&apos;hui.</EmptyState>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {d.todayRegs.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    {fullName(r)} →{" "}
                    <Link href={`/timonerie/evenements/${r.event.id}`} className="hover:text-rose">
                      {r.event.title}
                    </Link>
                  </span>
                  <Badge tone={r.status === "WAITLISTED" ? "warn" : "neutral"}>
                    {registrationStatusLabel[r.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Messages non traités"
          actions={
            <Link href="/timonerie/messages" className="text-xs text-rose">
              Tout voir
            </Link>
          }
        >
          {d.lastMessages.length === 0 ? (
            <EmptyState>Boîte de réception à jour.</EmptyState>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {d.lastMessages.map((m) => (
                <li key={m.id} className="py-2">
                  <p>
                    <b className="font-semibold">{m.firstName}</b>{" "}
                    <span className="text-ivory-3">· {formatDateTime(m.createdAt)}</span>
                  </p>
                  <p className="line-clamp-2 text-ivory-2">{m.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Dernières actions"
          className="lg:col-span-2"
          actions={
            <Link href="/timonerie/journal" className="text-xs text-rose">
              Journal complet
            </Link>
          }
        >
          <ul className="divide-y divide-line text-sm">
            {d.lastAudit.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <Badge
                    tone={
                      a.action === "LOGIN_FAILED"
                        ? "danger"
                        : a.action === "ANONYMIZE"
                          ? "rose"
                          : "neutral"
                    }
                  >
                    {auditActionLabel[a.action]}
                  </Badge>{" "}
                  {entityLabel[a.entity] ?? a.entity}
                  {a.actor === "SYSTEM" ? (
                    <span className="text-ivory-3"> · tâche planifiée</span>
                  ) : null}
                </span>
                <span className="text-xs text-ivory-3">{formatDateTime(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
