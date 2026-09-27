import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { gameOptions } from "@/server/queries/admin";
import { ImportWizard } from "./import-wizard";

export const metadata: Metadata = { title: "Importer des adhérents" };

export default async function ImportPage() {
  const games = await gameOptions();
  return (
    <>
      <PageHeader
        kicker="Adhérents"
        title="Importer un fichier CSV"
        description="Associez chaque colonne à un champ autorisé. Les autres colonnes (e-mail, téléphone, adresse…) sont ignorées : elles ne peuvent pas être importées."
      />
      <ImportWizard
        games={games.map((g) => ({ slug: g.slug, name: g.name, label: g.playerIdLabel }))}
      />
    </>
  );
}
