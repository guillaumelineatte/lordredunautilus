import type { Metadata } from "next";
import { PlansEditor } from "@/components/admin/content-editors";
import { PageHeader } from "@/components/admin/ui";
import { listPlansWithCounts } from "@/server/queries/admin";

export const metadata: Metadata = { title: "Formules" };

export default async function PlansPage() {
  const items = await listPlansWithCounts();
  return (
    <>
      <PageHeader
        kicker="Contenus"
        title="Formules d'adhésion"
        description="Affichées sur l'accueil et la page « Adhérer ». La formule Découverte est une simple carte d'information : elle ne crée jamais d'adhésion."
      />
      <PlansEditor items={items} />
    </>
  );
}
