import type { Metadata } from "next";
import { FilterSelect, SearchBox } from "@/components/admin/table-controls";
import { MembersTable } from "@/components/admin/members-table";
import {
  Pagination,
  parseListParams,
  SortHeader,
  type SearchParams,
} from "@/components/admin/table";
import { EmptyState, LinkButton, PageHeader } from "@/components/admin/ui";
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
            <LinkButton href="/api/timonerie/export/adherents" prefetch={false}>
              Exporter en CSV
            </LinkButton>
            <LinkButton href="/timonerie/adherents/import">Importer un CSV</LinkButton>
            <LinkButton href="/timonerie/adherents/fusion">Fusionner des doublons</LinkButton>
            <LinkButton href="/timonerie/adherents/nouveau" variant="primary" data-shortcut="new">
              Nouvel adhérent
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
        <MembersTable
          head={
            <>
              <SortHeader label="Nom" field="lastName" params={params} sp={sp} />
              <SortHeader label="Prénom" field="firstName" params={params} sp={sp} />
              <th>Jeux</th>
              <SortHeader label="Carte" field="cardNumber" params={params} sp={sp} />
              <th>Dernière adhésion</th>
              <SortHeader label="Statut" field="status" params={params} sp={sp} />
            </>
          }
          rows={rows.map((m) => {
            const last = m.memberships[0];
            return {
              id: m.id,
              firstName: m.firstName,
              lastName: m.lastName,
              isMinor: m.isMinor,
              games: m.gameIds.map((g) => g.game.name).join(", "),
              cardNumber: m.cardNumber,
              lastMembership: last
                ? `${last.plan.name}, jusqu'au ${formatDay(last.endDate)}`
                : null,
              ended: last ? dbDateToDay(last.endDate) < today : false,
              statusLabel: memberStatusLabel[m.status],
              statusTone: statusTone[m.status],
              inTrash: Boolean(m.deletedAt),
              membershipCount: m._count.memberships,
            };
          })}
        />
      )}
      <Pagination total={total} params={params} sp={sp} />
    </>
  );
}
