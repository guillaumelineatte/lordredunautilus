import type { Metadata } from "next";
import Link from "next/link";
import { FilterSelect } from "@/components/admin/table-controls";
import { parseListParams, TableWrap, type SearchParams } from "@/components/admin/table";
import { Badge, EmptyState, LinkButton, PageHeader } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";
import { auditActionLabel, entityLabel } from "@/lib/labels";
import { auditTargets, listAudit } from "@/server/queries/admin";
import { DateFilters } from "./date-filters";

export const metadata: Metadata = { title: "Journal d'activité" };

type DiffValue = { before: unknown; after: unknown };

function DiffView({ diff }: { diff: unknown }) {
  if (!diff || typeof diff !== "object") return null;
  const entries = Object.entries(diff as Record<string, DiffValue>);
  return (
    <table className="mt-2 w-full text-xs">
      <thead>
        <tr className="text-ivory-3">
          <th className="py-1 pr-3 text-left font-normal">Champ</th>
          <th className="py-1 pr-3 text-left font-normal">Avant</th>
          <th className="py-1 text-left font-normal">Après</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([field, v]) => (
          <tr key={field} className="border-t border-line align-top">
            <td className="py-1 pr-3 font-mono text-ivory-2">{field}</td>
            <td className="max-w-64 py-1 pr-3 break-words text-ivory-3">
              {v?.before == null ? "—" : String(v.before)}
            </td>
            <td className="max-w-64 py-1 break-words">
              {v?.after == null ? "—" : String(v.after)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function pageHref(sp: SearchParams, page: number) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) next.set(k, v);
  next.set("page", String(page));
  return `?${next}`;
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const params = parseListParams(sp, {
    sorts: ["createdAt"],
    defaultSort: "createdAt",
    defaultDir: "desc",
    filters: ["entite", "action", "du", "au"],
  });
  const { total, rows, size } = await listAudit(params);
  const targets = await auditTargets(rows);
  const pages = Math.max(1, Math.ceil(total / size));
  const exportParams = new URLSearchParams({
    ...(params.filters.entite ? { entite: params.filters.entite } : {}),
    ...(params.filters.action ? { action: params.filters.action } : {}),
  });

  return (
    <>
      <PageHeader
        kicker="Journal"
        title="Journal d'activité"
        description="Lecture seule. Chaque écriture de l'administration y est tracée ; les valeurs personnelles sont masquées. Conservation : 12 mois."
        actions={
          <LinkButton href={`/api/timonerie/export/journal?${exportParams}`} prefetch={false}>
            Exporter en CSV
          </LinkButton>
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <FilterSelect
          name="entite"
          label="Tous les éléments"
          options={Object.entries(entityLabel).map(([value, label]) => ({ value, label }))}
        />
        <FilterSelect
          name="action"
          label="Toutes les actions"
          options={Object.entries(auditActionLabel).map(([value, label]) => ({ value, label }))}
        />
        <DateFilters />
      </div>
      {rows.length === 0 ? (
        <EmptyState>Aucune entrée pour ces filtres.</EmptyState>
      ) : (
        <TableWrap>
          <table className="table-base">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Élément</th>
                <th>Détail</th>
                <th>Origine</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const target = r.entityId ? targets.get(`${r.entity}:${r.entityId}`) : undefined;
                const hasDiff =
                  r.diff && typeof r.diff === "object" && Object.keys(r.diff).length > 0;
                return (
                  <tr key={r.id} className="align-top">
                    <td className="text-xs whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                    <td>
                      <Badge
                        tone={
                          r.action === "LOGIN_FAILED"
                            ? "danger"
                            : r.action === "ANONYMIZE" || r.action === "DELETE"
                              ? "rose"
                              : "neutral"
                        }
                      >
                        {auditActionLabel[r.action]}
                      </Badge>
                    </td>
                    <td>
                      {entityLabel[r.entity] ?? r.entity}
                      {target ? (
                        <Link
                          href={target.href}
                          className="block text-xs text-rose hover:underline"
                        >
                          {target.label}
                        </Link>
                      ) : r.entityId ? (
                        <span className="block font-mono text-[0.65rem] text-ivory-3">
                          {r.entityId}
                        </span>
                      ) : null}
                    </td>
                    <td className="min-w-64">
                      {hasDiff ? (
                        <details>
                          <summary className="cursor-pointer text-xs text-ivory-2">
                            {Object.keys(r.diff as object).length} champ(s)
                          </summary>
                          <DiffView diff={r.diff} />
                        </details>
                      ) : (
                        <span className="text-xs text-ivory-3">—</span>
                      )}
                    </td>
                    <td className="text-xs text-ivory-3">
                      {r.actor === "SYSTEM" ? "Tâche planifiée" : (r.ip ?? "—")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}
      <nav
        aria-label="Pagination"
        className="mt-4 flex items-center justify-between text-xs text-ivory-3"
      >
        <span>
          {total} entrée(s) · page {params.page} sur {pages}
        </span>
        <span className="flex gap-2">
          {params.page > 1 ? (
            <Link
              href={pageHref(sp, params.page - 1)}
              className="rounded-full border border-line-strong px-3 py-1 hover:border-ivory"
            >
              ← Plus récentes
            </Link>
          ) : null}
          {params.page < pages ? (
            <Link
              href={pageHref(sp, params.page + 1)}
              className="rounded-full border border-line-strong px-3 py-1 hover:border-ivory"
            >
              Plus anciennes →
            </Link>
          ) : null}
        </span>
      </nav>
    </>
  );
}
