import Link from "next/link";
import { acceptsRegistration, placesLeft, type EventDTO } from "@/lib/dto";
import { eventDateParts, formatHour } from "@/lib/format";
import { eventTypeLabel } from "@/lib/labels";

function placeLabel(e: EventDTO): string {
  if (e.type === "OPEN_PLAY") return "Sans inscription";
  const left = placesLeft(e);
  if (left === null) return "Ouvert à tous";
  if (left === 0)
    return e.waitlisted > 0
      ? `Complet · ${e.waitlisted} en liste d'attente`
      : "Complet · liste d'attente";
  return `${left} place${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""}`;
}

/** Ligne d'agenda, identique au site vitrine, reliée à la page de l'événement. */
export function EventRow({ event }: { event: EventDTO }) {
  const start = new Date(event.startsAt);
  const { day, month } = eventDateParts(start);
  const left = placesLeft(event);
  const full = left === 0;
  const cancelled = event.status === "CANCELLED";
  const tag = cancelled
    ? "annulé"
    : event.isHot && !full
      ? "Places limitées"
      : full
        ? "complet"
        : eventTypeLabel[event.type];
  const cta = cancelled
    ? "Détails"
    : event.type === "OPEN_PLAY"
      ? "Je viens"
      : acceptsRegistration(event)
        ? full
          ? "Liste d'attente"
          : "Je m'inscris"
        : "Détails";

  return (
    <article className="event">
      <div className="date">
        <b>{day}</b>
        <small>{month}</small>
      </div>
      <div className="info">
        <h3>
          <Link href={`/evenements/${event.slug}`}>{event.title}</Link>
          <span
            className={`tag${cancelled ? "cancelled" : event.isHot && !full ? "hot" : full ? "full" : ""}`}
          >
            {tag}
          </span>
        </h3>
        <p>
          {event.game?.name ?? "Tous jeux"} — {formatHour(start)} — {placeLabel(event)}
        </p>
      </div>
      <Link
        className="btn btn-ghost btn-small"
        href={`/evenements/${event.slug}`}
        aria-label={`${cta} : ${event.title}`}
      >
        {cta}
      </Link>
    </article>
  );
}
