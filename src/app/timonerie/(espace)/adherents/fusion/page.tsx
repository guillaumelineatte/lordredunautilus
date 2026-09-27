import type { Metadata } from "next";
import { Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { formatDay } from "@/lib/format";
import { findDuplicateGroups, memberOptions } from "@/server/queries/admin";
import { MergeForm } from "./merge-form";

export const metadata: Metadata = { title: "Fusionner des doublons" };

export default async function MergePage() {
  const [groups, members] = await Promise.all([findDuplicateGroups(), memberOptions()]);
  const options = members.map((m) => ({
    id: m.id,
    label: `${m.lastName} ${m.firstName}${m.cardNumber ? ` — ${m.cardNumber}` : ""}`,
  }));
  return (
    <>
      <PageHeader
        kicker="Adhérents"
        title="Fusionner des doublons"
        description="Adhésions, inscriptions, identifiants de jeu et autorisations passent sur la fiche conservée ; l'autre fiche est supprimée."
      />
      <div className="grid gap-6">
        <Card title="Doublons probables (même nom et prénom)">
          {groups.length === 0 ? (
            <EmptyState>Aucun doublon évident détecté.</EmptyState>
          ) : (
            <ul className="grid gap-4">
              {groups.map((g) => (
                <li key={g[0]?.id} className="rounded-m border border-line p-4">
                  <p className="mb-2 font-semibold">
                    {g[0]?.firstName} {g[0]?.lastName}
                  </p>
                  <ul className="mb-3 text-sm text-ivory-2">
                    {g.map((m) => (
                      <li key={m.id}>
                        Fiche créée le {formatDay(m.createdAt)} · {m._count.memberships} adhésion(s)
                        {m.cardNumber ? ` · carte ${m.cardNumber}` : ""}
                      </li>
                    ))}
                  </ul>
                  <MergeForm options={options} keepId={g[0]?.id} dropId={g[1]?.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Fusion manuelle">
          <MergeForm options={options} />
        </Card>
      </div>
    </>
  );
}
