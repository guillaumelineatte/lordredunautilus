import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/site/json-ld";
import { Markdown } from "@/components/site/markdown";
import { RegistrationForm } from "@/components/site/registration-form";
import { acceptsRegistration, placesLeft } from "@/lib/dto";
import { formatEventDate, formatHour, formatMoney } from "@/lib/format";
import { eventTypeLabel } from "@/lib/labels";
import { formatAddress } from "@/lib/settings";
import { getEventBySlug, getPublishedEventSlugs, getSettings } from "@/server/queries/public";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const slugs = await getPublishedEventSlugs();
    return slugs.slice(0, 50).map((s) => ({ slug: s.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Événement introuvable" };
  const when = `${formatEventDate(new Date(event.startsAt))} à ${formatHour(new Date(event.startsAt))}`;
  return {
    title: `${event.title} — ${when}`,
    description: `${event.title}${event.game ? ` (${event.game.name})` : ""} à Amiens, ${when}. ${event.type === "OPEN_PLAY" ? "Sans inscription." : "Inscription gratuite et sans compte."}`,
    alternates: { canonical: `/evenements/${event.slug}` },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [event, settings] = await Promise.all([getEventBySlug(slug), getSettings()]);
  if (!event) notFound();

  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : null;
  const place = event.location ?? formatAddress(settings.address);
  const left = placesLeft(event);
  const full = left === 0;
  const open = acceptsRegistration(event);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.startsAt,
    ...(event.endsAt ? { endDate: event.endsAt } : {}),
    eventStatus:
      event.status === "CANCELLED"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    description: event.description ?? `${event.title} à Amiens`,
    image: [`${siteUrl}/logo.png`],
    location: {
      "@type": "Place",
      name: event.location ?? settings.address.venue,
      address: {
        "@type": "PostalAddress",
        streetAddress: settings.address.street,
        postalCode: settings.address.postalCode,
        addressLocality: settings.address.city,
        addressCountry: "FR",
      },
    },
    organizer: { "@type": "Organization", name: settings.legal.associationName, url: siteUrl },
    offers: {
      "@type": "Offer",
      price: ((event.priceCents ?? 0) / 100).toFixed(2),
      priceCurrency: "EUR",
      availability: full ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      url: `${siteUrl}/evenements/${event.slug}`,
    },
  };

  return (
    <section className="page event-page" aria-labelledby="event-title">
      <JsonLd data={jsonLd} />
      <div className="wrap">
        <Link className="back" href="/evenements">
          ← Tout l&apos;agenda
        </Link>
        <p className="kicker">
          {event.game?.name ?? "Tous jeux"} · {eventTypeLabel[event.type]}
        </p>
        <h2 id="event-title">{event.title}</h2>
        <div className="layout">
          <div>
            <dl className="facts">
              <div>
                <dt>Quand</dt>
                <dd>
                  {formatEventDate(start)}, {formatHour(start)}
                  {end ? ` – ${formatHour(end)}` : ""}
                </dd>
              </div>
              <div>
                <dt>Où</dt>
                <dd>{place}</dd>
              </div>
              <div>
                <dt>Prix</dt>
                <dd>{event.priceCents ? formatMoney(event.priceCents) : "Gratuit"}</dd>
              </div>
              <div>
                <dt>Places</dt>
                <dd>
                  {event.type === "OPEN_PLAY" ? (
                    "Sans inscription"
                  ) : left === null ? (
                    <span className="places">Ouvert à tous</span>
                  ) : (
                    <span className={`places${full ? "full" : ""}`}>
                      {full
                        ? `Complet${event.waitlisted ? ` · ${event.waitlisted} en liste d'attente` : ""}`
                        : `${left} place${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""} sur ${event.capacity}`}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
            {event.description ? (
              <div className="prose">
                <Markdown>{event.description}</Markdown>
              </div>
            ) : null}
          </div>

          <aside className="panel">
            {event.status === "CANCELLED" ? (
              <>
                <h3>Événement annulé</h3>
                <p className="sub">
                  Toutes nos excuses. Retrouvez les prochaines dates dans l&apos;agenda.
                </p>
                <Link className="btn btn-ghost" href="/evenements">
                  Voir l&apos;agenda
                </Link>
              </>
            ) : event.type === "OPEN_PLAY" ? (
              <>
                <h3>Pas besoin de s&apos;inscrire</h3>
                <p className="sub">
                  Venez directement avec votre deck, ou empruntez-en un sur place : il y a toujours
                  une table.
                </p>
                <Link className="btn btn-ghost" href="/#contact">
                  Une question ?
                </Link>
              </>
            ) : !open ? (
              <>
                <h3>Inscriptions closes</h3>
                <p className="sub">Cet événement est passé ou les inscriptions sont fermées.</p>
              </>
            ) : (
              <>
                <h3>{full ? "Liste d'attente" : "Réserver une place"}</h3>
                <p className="sub">
                  Sans compte, en 30 secondes.
                  {full
                    ? " L'événement est complet : vous serez prévenu si une place se libère."
                    : ""}
                </p>
                <RegistrationForm
                  eventId={event.id}
                  full={full}
                  requirePlayerId={event.type === "TOURNAMENT" && Boolean(event.game)}
                  game={
                    event.game
                      ? {
                          name: event.game.name,
                          playerIdLabel: event.game.playerIdLabel,
                          playerIdPattern: event.game.playerIdPattern,
                          playerIdExample: event.game.playerIdExample,
                        }
                      : null
                  }
                />
              </>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
