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
import { todayParis, dbDateToDay } from "@/lib/dates";
import { formatDay } from "@/lib/format";
import { memberStatusLabel } from "@/lib/labels";
import { gameOptions, listMembers } from "@/server/queries/admin";

export const metadata: Metadata = { title: "Adhérents" };

const statusTone = { ACTIVE: "ok", EXPIRED: "warn", SUSPENDED: "danger" } as const;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const params = parseListParams(sp, {
    sorts: ["lastName", "firstName", "cardNumber", "status", "createdAt"],
    defaultSort: "lastName",
    filters: ["status", "jeu", "mineur"],
  });
  const [{ total, rows }, games] = await Promise.all([listMembers(params), gameOptions()]);
  const today = todayParis();

  return (
    <>
      <PageHeader
        kicker="Adhérents"
        title="Les membres de l'équipage"
        description="Seules les données nécessaires sont conservées : nom, prénom, année de naissance, identifiants de jeu, adhésions, carte et autorisations."
        actions={
          <>
            <LinkButton href="/api/admin/export/adherents" prefetch={false}>
              Exporter en CSV
            </LinkButton>
            <LinkButton href="/admin/adherents/import">Importer un CSV</LinkButton>
            <LinkButton href="/admin/adherents/fusion">Fusionner des doublons</LinkButton>
            <LinkButton href="/admin/adherents/nouveau" variant="primary" data-shortcut="new">
              Nouvel adhérent <kbd className="text-[0.65rem] opacity-70">n</kbd>
            </LinkButton>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Nom, prénom, carte ou identifiant de jeu" />
        <FilterSelect
          name="status"
          label="Tous les statuts"
          options={[
            ...Object.entries(memberStatusLabel).map(([value, label]) => ({ value, label })),
            { value: "corbeille", label: "Corbeille" },
          ]}
        />
        <FilterSelect
          name="jeu"
          label="Tous les jeux"
          options={games.map((g) => ({ value: g.slug, label: g.name }))}
        />
        <FilterSelect
          name="mineur"
          label="Majeurs et mineurs"
          options={[{ value: "oui", label: "Mineurs uniquement" }]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState>
          {params.q || Object.keys(params.filters).length
            ? "Aucun adhérent ne correspond à ces critères."
            : "Aucun adhérent pour l'instant."}
        </EmptyState>
      ) : (
        <TableWrap>
          <table className="table-base">
            <thead>
              <tr>
                <SortHeader label="Nom" field="lastName" params={params} sp={sp} />
                <SortHeader label="Prénom" field="firstName" params={params} sp={sp} />
                <th>Jeux</th>
                <SortHeader label="Carte" field="cardNumber" params={params} sp={sp} />
                <th>Dernière adhésion</th>
                <SortHeader label="Statut" field="status" params={params} sp={sp} />
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const last = m.memberships[0];
                const ended = last ? dbDateToDay(last.endDate) < today : false;
                return (
                  <tr key={m.id}>
                    <td>
                      <Link
                        href={`/admin/adherents/${m.id}`}
                        className="font-semibold hover:text-rose"
                      >
                        {m.lastName}
                      </Link>
                      {m.isMinor ? (
                        <Badge tone="rose" className="ml-2">
                          mineur
                        </Badge>
                      ) : null}
                    </td>
                    <td>{m.firstName}</td>
                    <td className="text-ivory-2">
                      {m.gameIds.map((g) => g.game.name).join(", ") || "—"}
                    </td>
                    <td className="font-mono text-xs">{m.cardNumber ?? "—"}</td>
                    <td className={ended ? "text-ivory-3" : ""}>
                      {last ? `${last.plan.name}, jusqu'au ${formatDay(last.endDate)}` : "Aucune"}
                    </td>
                    <td>
                      {m.deletedAt ? (
                        <Badge tone="danger">corbeille</Badge>
                      ) : (
                        <Badge tone={statusTone[m.status]}>{memberStatusLabel[m.status]}</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}
      <Pagination total={total} params={params} sp={sp} />
    </>
  );
}
