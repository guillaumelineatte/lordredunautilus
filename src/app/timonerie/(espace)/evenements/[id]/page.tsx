import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/action-button";
import { EventForm } from "@/components/admin/event-form";
import { AddRegistrationForm, RegistrationsTable } from "@/components/admin/registrations";
import { Badge, Card, LinkButton, PageHeader } from "@/components/admin/ui";
import { parisDay, parisTime } from "@/lib/dates";
import { formatDateTime, formatEventDate, formatHour } from "@/lib/format";
import { eventStatusLabel } from "@/lib/labels";
import { formatAddress } from "@/lib/settings";
import { duplicateEvent, restoreEvent, setEventStatus, trashEvent } from "@/server/actions/events";
import { gameOptions, getEventAdmin, memberOptions } from "@/server/queries/admin";
import { getSettings } from "@/server/queries/public";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const e = await getEventAdmin(id);
  return { title: e?.title ?? "Événement" };
}

export default async function EventAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [event, games, members, settings] = await Promise.all([
    getEventAdmin(id),
    gameOptions(true),
    memberOptions(),
    getSettings(),
  ]);
  if (!event) notFound();

  const active = event.registrations.filter(
    (r) => r.status === "REGISTERED" || r.status === "PRESENT",
  );
  const waitlist = event.registrations.filter((r) => r.status === "WAITLISTED");
  const others = event.registrations.filter(
    (r) => r.status === "ABSENT" || r.status === "CANCELLED",
  );
  const toRow = (r: (typeof event.registrations)[number]) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    playerId: r.playerId,
    isMinor: r.isMinor,
    hasEmail: Boolean(r.email),
    status: r.status,
    source: r.source,
    memberId: r.memberId,
    createdAt: r.createdAt.toISOString(),
  });
  const memberOpts = members.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
  }));
  const idLabel = event.game?.playerIdLabel ?? "Identifiant";
  const isPast = event.startsAt < new Date();

  return (
    <>
      <PageHeader
        back={{ href: "/timonerie/evenements", label: "Événements" }}
        kicker="Événement"
        title={event.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge
              tone={
                event.status === "PUBLISHED"
                  ? "ok"
                  : event.status === "CANCELLED"
                    ? "danger"
                    : "neutral"
              }
            >
              {eventStatusLabel[event.status]}
            </Badge>
            <span>
              {formatEventDate(event.startsAt)} à {formatHour(event.startsAt)}
              {event.game ? ` · ${event.game.name}` : ""}
            </span>
            {event.discordPostedAt ? (
              <span className="text-xs text-ivory-3">
                annoncé sur Discord le {formatDateTime(event.discordPostedAt)}
              </span>
            ) : null}
          </span>
        }
        actions={
          <>
            {event.status !== "PUBLISHED" && !event.deletedAt ? (
              <ActionButton
                action={setEventStatus}
                input={{ id: event.id, status: "PUBLISHED" }}
                variant="primary"
                size="md"
                success="Événement publié."
              >
                Publier
              </ActionButton>
            ) : null}
            {event.status === "PUBLISHED" ? (
              <>
                <LinkButton href={`/evenements/${event.slug}`} target="_blank">
                  Voir sur le site ↗
                </LinkButton>
                <ActionButton
                  action={setEventStatus}
                  input={{ id: event.id, status: "DRAFT" }}
                  size="md"
                  success="Repassé en brouillon."
                >
                  Dépublier
                </ActionButton>
              </>
            ) : null}
            <ActionButton
              action={duplicateEvent}
              input={{ id: event.id }}
              size="md"
              success="Copie créée en brouillon, une semaine plus tard."
            >
              Dupliquer
            </ActionButton>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-6">
          {event.type !== "OPEN_PLAY" ? (
            <Card
              title={`Inscrits (${active.length}${event.capacity ? ` / ${event.capacity}` : ""})`}
              actions={
                <span className="flex gap-2">
                  <LinkButton
                    href={`/api/timonerie/pdf/emargement?evenement=${event.id}`}
                    prefetch={false}
                    size="sm"
                  >
                    Feuille d&apos;émargement
                  </LinkButton>
                  <LinkButton
                    href={`/api/timonerie/export/inscrits?evenement=${event.id}`}
                    prefetch={false}
                    size="sm"
                  >
                    CSV
                  </LinkButton>
                </span>
              }
            >
              <RegistrationsTable
                rows={active.map(toRow)}
                members={memberOpts}
                playerIdLabel={idLabel}
              />
              {waitlist.length > 0 ? (
                <>
                  <h3 className="mt-6 mb-2 text-base">
                    Liste d&apos;attente ({waitlist.length}) — ordre d&apos;arrivée
                  </h3>
                  <RegistrationsTable
                    rows={waitlist.map(toRow)}
                    members={memberOpts}
                    playerIdLabel={idLabel}
                  />
                </>
              ) : null}
              {others.length > 0 ? (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm text-ivory-2">
                    Absents et annulations ({others.length})
                  </summary>
                  <div className="mt-3">
                    <RegistrationsTable
                      rows={others.map(toRow)}
                      members={memberOpts}
                      playerIdLabel={idLabel}
                    />
                  </div>
                </details>
              ) : null}
              <details className="mt-6 rounded-m border border-line p-4">
                <summary className="cursor-pointer font-head text-sm tracking-[0.06em] text-rose">
                  Ajouter un participant à la main
                </summary>
                <div className="mt-4">
                  <AddRegistrationForm
                    eventId={event.id}
                    members={memberOpts}
                    playerIdLabel={idLabel}
                  />
                </div>
              </details>
            </Card>
          ) : (
            <Card title="Soirée libre">
              <p className="text-sm text-ivory-2">
                Pas d&apos;inscription pour les soirées libres : le site affiche « Sans inscription
                ».
              </p>
            </Card>
          )}

          <Card title="Modifier l'événement">
            <EventForm
              games={games}
              defaultLocation={formatAddress(settings.address)}
              initial={{
                id: event.id,
                title: event.title,
                gameId: event.gameId,
                type: event.type,
                date: parisDay(event.startsAt),
                startTime: parisTime(event.startsAt),
                endTime: event.endsAt ? parisTime(event.endsAt) : "",
                location: event.location,
                description: event.description,
                capacity: event.capacity,
                priceCents: event.priceCents,
                isHot: event.isHot,
                status: event.status,
              }}
            />
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card title="Statut">
            <div className="flex flex-wrap gap-2">
              {event.status !== "CANCELLED" ? (
                <ActionButton
                  action={setEventStatus}
                  input={{ id: event.id, status: "CANCELLED" }}
                  variant="danger"
                  confirm="Annuler l'événement ? Les inscrits ayant laissé un e-mail seront prévenus."
                  success="Événement annulé."
                >
                  Annuler l&apos;événement
                </ActionButton>
              ) : null}
              {isPast && event.status !== "COMPLETED" ? (
                <ActionButton
                  action={setEventStatus}
                  input={{ id: event.id, status: "COMPLETED" }}
                  success="Événement terminé."
                >
                  Marquer terminé
                </ActionButton>
              ) : null}
              {event.deletedAt ? (
                <ActionButton
                  action={restoreEvent}
                  input={{ id: event.id }}
                  success="Événement restauré."
                >
                  Restaurer
                </ActionButton>
              ) : (
                <ActionButton
                  action={trashEvent}
                  input={{ id: event.id }}
                  variant="subtle"
                  confirm="Mettre l'événement à la corbeille ?"
                  redirectTo="/timonerie/evenements"
                >
                  Corbeille
                </ActionButton>
              )}
            </div>
          </Card>
          <Card title="Récapitulatif">
            <ul className="grid gap-1 text-sm text-ivory-2">
              <li>Inscrits : {active.length}</li>
              <li>
                Présents pointés :{" "}
                {event.registrations.filter((r) => r.status === "PRESENT").length}
              </li>
              <li>Liste d&apos;attente : {waitlist.length}</li>
              <li>Mineurs : {active.filter((r) => r.isMinor).length}</li>
              <li>Photos rattachées : {event._count.photos}</li>
            </ul>
            <p className="mt-3 text-xs text-ivory-3">
              Les e-mails facultatifs des inscrits sont effacés automatiquement 7 jours après
              l&apos;événement.
            </p>
            <Link
              href={`/timonerie/galerie?evenement=${event.id}`}
              className="mt-3 inline-block text-xs text-rose"
            >
              Gérer les photos de la soirée →
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}
