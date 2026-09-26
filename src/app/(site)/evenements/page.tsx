import type { Metadata } from "next";
import Link from "next/link";
import type { EventType } from "@/generated/prisma/enums";
import { EventRow } from "@/components/site/event-row";
import { getGames, getUpcomingEvents } from "@/server/queries/public";

export const metadata: Metadata = {
  title: "Agenda des soirées et tournois",
  description:
    "Toutes les soirées de la saison à Amiens : découverte, tables libres, drafts et tournois Magic, Pokémon, Yu-Gi-Oh!, Lorcana, One Piece.",
  alternates: { canonical: "/evenements" },
};

const TYPES: { slug: string; type: EventType; label: string }[] = [
  { slug: "decouverte", type: "DISCOVERY", label: "Découverte" },
  { slug: "libre", type: "OPEN_PLAY", label: "Libre" },
  { slug: "draft", type: "DRAFT", label: "Draft" },
  { slug: "tournoi", type: "TOURNAMENT", label: "Tournoi" },
];

type SP = Promise<Record<string, string | string[] | undefined>>;

function href(params: { jeu?: string; type?: string }) {
  const q = new URLSearchParams();
  if (params.jeu) q.set("jeu", params.jeu);
  if (params.type) q.set("type", params.type);
  const s = q.toString();
  return s ? `/evenements?${s}` : "/evenements";
}

export default async function AgendaPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const jeu = typeof sp.jeu === "string" ? sp.jeu : undefined;
  const typeSlug = typeof sp.type === "string" ? sp.type : undefined;
  const type = TYPES.find((t) => t.slug === typeSlug);
  const [games, events] = await Promise.all([
    getGames(),
    getUpcomingEvents({ game: jeu, type: type?.type }),
  ]);
  const gameName = games.find((g) => g.slug === jeu)?.name;

  return (
    <section className="page" id="page-evenements" aria-labelledby="ev-title">
      <div className="wrap">
        <Link className="back" href="/">
          ← Retour à l&apos;accueil
        </Link>
        <p className="kicker">Agenda</p>
        <h2 id="ev-title">Toutes les soirées de la saison</h2>
        <nav className="filters" aria-label="Filtrer par jeu">
          <Link href={href({ type: typeSlug })} aria-current={!jeu}>
            Tous
          </Link>
          {games.map((g) => (
            <Link
              key={g.id}
              href={href({ jeu: g.slug, type: typeSlug })}
              aria-current={jeu === g.slug}
            >
              {g.name}
            </Link>
          ))}
        </nav>
        <nav className="filters" aria-label="Filtrer par type">
          <span className="label-inline">Type</span>
          <Link href={href({ jeu })} aria-current={!type}>
            Tous
          </Link>
          {TYPES.map((t) => (
            <Link
              key={t.slug}
              href={href({ jeu, type: t.slug })}
              aria-current={type?.slug === t.slug}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="event-list" id="fulllist">
          {events.length ? (
            events.map((e) => <EventRow key={e.id} event={e} />)
          ) : (
            <div className="empty">
              Rien de prévu{gameName ? ` pour ${gameName}` : ""}
              {type ? ` en ${type.label.toLowerCase()}` : ""} dans les prochaines semaines. Proposez
              une date sur le Discord.
            </div>
          )}
        </div>
        <p style={{ marginTop: "2rem", color: "var(--ivory-3)", fontSize: ".9rem" }}>
          Les soirées « libre » se font sans inscription : venez directement, il y a toujours une
          table.
        </p>
      </div>
    </section>
  );
}
