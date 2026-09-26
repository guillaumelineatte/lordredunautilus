import type { Metadata } from "next";
import Link from "next/link";
import { FilterSelect, SearchBox } from "@/components/admin/table-controls";
import {
  Pagination,
  parseListParams,
  SortHeader,
  TableWrap,
  type SearchParams,
} from "@/components/admin/table";
import { Badge, EmptyState, LinkButton, PageHeader } from "@/components/admin/ui";
import { formatEventDate, formatHour } from "@/lib/format";
import { eventStatusLabel, eventTypeLabel } from "@/lib/labels";
import { gameOptions, listEvents } from "@/server/queries/admin";

export const metadata: Metadata = { title: "Événements" };

const statusTone = {
  DRAFT: "neutral",
  PUBLISHED: "ok",
  CANCELLED: "danger",
  COMPLETED: "neutral",
} as const;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const params = parseListParams(sp, {
    sorts: ["startsAt", "title", "status"],
    defaultSort: "startsAt",
    filters: ["statut", "jeu", "periode"],
  });
  const [{ total, rows }, games] = await Promise.all([listEvents(params), gameOptions()]);

  return (
    <>
      <PageHeader
        kicker="Événements"
        title="L'agenda"
        description="Brouillon → publié : seuls les événements publiés apparaissent sur le site. Les événements passés passent en « terminé » chaque nuit."
        actions={
          <LinkButton href="/admin/evenements/nouveau" variant="primary" data-shortcut="new">
            Nouvel événement <kbd className="text-[0.65rem] opacity-70">n</kbd>
          </LinkButton>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Titre de l'événement" />
        <FilterSelect
          name="periode"
          label="À venir"
          options={[
            { value: "passes", label: "Passés" },
            { value: "tous", label: "Tous" },
          ]}
        />
        <FilterSelect
          name="statut"
          label="Tous les statuts"
          options={[
            ...Object.entries(eventStatusLabel).map(([value, label]) => ({ value, label })),
            { value: "corbeille", label: "Corbeille" },
          ]}
        />
        <FilterSelect
          name="jeu"
          label="Tous les jeux"
          options={games.map((g) => ({ value: g.slug, label: g.name }))}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState>Aucun événement ne correspond à ces critères.</EmptyState>
      ) : (
        <TableWrap>
          <table className="table-base">
            <thead>
              <tr>
                <SortHeader label="Date" field="startsAt" params={params} sp={sp} />
                <SortHeader label="Titre" field="title" params={params} sp={sp} />
                <th>Jeu</th>
                <th>Inscrits</th>
                <SortHeader label="Statut" field="status" params={params} sp={sp} />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap">
                    {formatEventDate(e.startsAt)}
                    <span className="text-ivory-3"> · {formatHour(e.startsAt)}</span>
                  </td>
                  <td>
                    <Link
                      href={`/admin/evenements/${e.id}`}
                      className="font-semibold hover:text-rose"
                    >
                      {e.title}
                    </Link>
                    <span className="ml-2 text-xs text-ivory-3">{eventTypeLabel[e.type]}</span>
                    {e.isHot ? (
                      <Badge tone="rose" className="ml-2">
                        en avant
                      </Badge>
                    ) : null}
                  </td>
                  <td className="text-ivory-2">{e.game?.name ?? "—"}</td>
                  <td>
                    {e.type === "OPEN_PLAY" ? (
                      <span className="text-ivory-3">libre</span>
                    ) : (
                      <>
                        {e._count.registrations}
                        {e.capacity ? ` / ${e.capacity}` : ""}
                        {e.waitlisted > 0 ? (
                          <Badge tone="warn" className="ml-2">
                            +{e.waitlisted} en attente
                          </Badge>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td>
                    {e.deletedAt ? (
                      <Badge tone="danger">corbeille</Badge>
                    ) : (
                      <Badge tone={statusTone[e.status]}>{eventStatusLabel[e.status]}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
      <Pagination total={total} params={params} sp={sp} />
    </>
  );
}
