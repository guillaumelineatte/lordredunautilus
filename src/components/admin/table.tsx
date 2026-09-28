import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

export type SearchParams = Record<string, string | string[] | undefined>;

export type ListParams = {
  q: string;
  sort: string;
  dir: "asc" | "desc";
  page: number;
  filters: Record<string, string>;
};

export const PAGE_SIZE = 25;

export function parseListParams(
  sp: SearchParams,
  {
    sorts,
    defaultSort,
    defaultDir = "asc",
    filters = [],
  }: { sorts: string[]; defaultSort: string; defaultDir?: "asc" | "desc"; filters?: string[] },
): ListParams {
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
  };
  const sort = sorts.includes(one("sort")) ? one("sort") : defaultSort;
  const dir = one("dir") === "desc" ? "desc" : one("dir") === "asc" ? "asc" : defaultDir;
  const page = Math.max(1, Number.parseInt(one("page"), 10) || 1);
  const f: Record<string, string> = {};
  for (const name of filters) if (one(name)) f[name] = one(name);
  return { q: one("q").trim().slice(0, 100), sort, dir, page, filters: f };
}

function href(sp: SearchParams, changes: Record<string, string | null>) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value) next.set(k, value);
  }
  for (const [k, v] of Object.entries(changes)) {
    if (v === null) next.delete(k);
    else next.set(k, v);
  }
  const s = next.toString();
  return s ? `?${s}` : "?";
}

// en-tête triable, c'est juste un lien donc ça marche côté serveur
export function SortHeader({
  label,
  field,
  params,
  sp,
  className,
}: {
  label: string;
  field: string;
  params: ListParams;
  sp: SearchParams;
  className?: string;
}) {
  const active = params.sort === field;
  const nextDir = active && params.dir === "asc" ? "desc" : "asc";
  return (
    <th
      className={className}
      aria-sort={active ? (params.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <Link
        href={href(sp, { sort: field, dir: nextDir, page: null })}
        className={clsx("inline-flex items-center gap-1 hover:text-ivory", active && "text-ivory")}
      >
        {label}
        <span aria-hidden className="text-[0.6rem]">
          {active ? (params.dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </Link>
    </th>
  );
}

export function Pagination({
  total,
  params,
  sp,
}: {
  total: number;
  params: ListParams;
  sp: SearchParams;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return <p className="mt-4 text-xs text-ivory-3">{total} résultat(s)</p>;
  const prev = params.page > 1 ? href(sp, { page: String(params.page - 1) }) : null;
  const next = params.page < pages ? href(sp, { page: String(params.page + 1) }) : null;
  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex items-center justify-between text-sm text-ivory-2"
    >
      <span className="text-xs text-ivory-3">
        {total} résultat(s) · page {params.page} sur {pages}
      </span>
      <span className="flex gap-2">
        {prev ? (
          <Link
            href={prev}
            className="rounded-full border border-line-strong px-3 py-1 hover:border-ivory"
          >
            ← Précédente
          </Link>
        ) : null}
        {next ? (
          <Link
            href={next}
            className="rounded-full border border-line-strong px-3 py-1 hover:border-ivory"
          >
            Suivante →
          </Link>
        ) : null}
      </span>
    </nav>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="card overflow-x-auto">{children}</div>;
}
