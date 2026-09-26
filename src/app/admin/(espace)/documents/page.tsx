import type { Metadata } from "next";
import { Card, LinkButton, PageHeader } from "@/components/admin/ui";
import { formatEventDate } from "@/lib/format";
import { documentOptions } from "@/server/queries/admin";
import { DocumentPickers } from "./pickers";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const { members, minors, events } = await documentOptions();
  const toOpt = (m: { id: string; firstName: string; lastName: string }) => ({
    value: m.id,
    label: `${m.lastName} ${m.firstName}`,
  });

  return (
    <>
      <PageHeader
        kicker="Documents"
        title="Documents à imprimer"
        description="PDF générés à la volée, en français, avec le logo. Chaque génération est tracée dans le journal."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Autorisation parentale">
          <p className="mb-4 text-sm text-ivory-2">
            Trois autorisations à cocher séparément (adhésion, galerie, réseaux) et un encart RGPD.
            Une fois signée, cochez les cases miroir sur la fiche et joignez le scan.
          </p>
          <div className="grid gap-3">
            <LinkButton href="/api/admin/pdf/autorisation-parentale" prefetch={false}>
              Télécharger le modèle vierge
            </LinkButton>
            <DocumentPickers
              kind="autorisation-parentale"
              param="adherent"
              label="Pré-remplie pour un mineur"
              options={minors.map(toOpt)}
            />
          </div>
        </Card>
        <Card title="Carte de membre">
          <p className="mb-4 text-sm text-ivory-2">
            Recto/verso : nom, prénom, numéro de carte, saison et jeux pratiqués.
          </p>
          <div className="grid gap-3">
            <DocumentPickers
              kind="carte"
              param="adherent"
              label="Format CR80 (carte bancaire)"
              options={members.map(toOpt)}
            />
            <DocumentPickers
              kind="carte"
              param="adherent"
              label="Format A6"
              options={members.map(toOpt)}
              extra="format=a6"
            />
          </div>
        </Card>
        <Card title="Feuille d'émargement">
          <p className="mb-4 text-sm text-ivory-2">
            Liste des inscrits, colonne présence et colonne signature, liste d&apos;attente à part.
          </p>
          <DocumentPickers
            kind="emargement"
            param="evenement"
            label="Événement"
            options={events.map((e) => ({
              value: e.id,
              label: `${e.title} — ${formatEventDate(e.startsAt)}`,
            }))}
          />
        </Card>
        <Card title="Registre des traitements">
          <p className="mb-4 text-sm text-ivory-2">
            Registre RGPD pré-rédigé d&apos;après le modèle CNIL.
          </p>
          <LinkButton href="/api/admin/pdf/registre" prefetch={false}>
            Exporter le registre en PDF
          </LinkButton>
        </Card>
      </div>
    </>
  );
}
