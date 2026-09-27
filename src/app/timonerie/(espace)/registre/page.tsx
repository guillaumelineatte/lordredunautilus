import type { Metadata } from "next";
import { Card, LinkButton, PageHeader } from "@/components/admin/ui";
import { PROCESSINGS } from "@/lib/processing-register";
import { adminSettings } from "@/server/queries/admin";

export const metadata: Metadata = { title: "Registre des traitements" };

export default async function RegisterPage() {
  const settings = await adminSettings();
  return (
    <>
      <PageHeader
        kicker="RGPD"
        title="Registre des activités de traitement"
        description={`Responsable du traitement : ${settings.legal.associationName}, représentée par ${settings.legal.president}. Contact : ${settings.contactEmail}.`}
        actions={
          <LinkButton href="/api/timonerie/pdf/registre" prefetch={false} variant="primary">
            Exporter en PDF
          </LinkButton>
        }
      />
      <p className="mb-6 max-w-3xl text-sm text-ivory-2">
        Pré-rédigé d&apos;après le modèle de la CNIL. À relire en bureau, à compléter si
        l&apos;association met en place d&apos;autres traitements (fichier papier, tableur, groupe
        de discussion…), puis à conserver à jour.
      </p>
      <div className="grid gap-4">
        {PROCESSINGS.map((p, i) => (
          <Card key={p.name} title={`${i + 1}. ${p.name}`}>
            <dl className="grid gap-3 text-sm md:grid-cols-[12rem_1fr]">
              {(
                [
                  ["Finalité", p.purpose],
                  ["Base légale", p.legalBasis],
                  ["Personnes concernées", p.people],
                  [
                    "Données",
                    <ul key="d" className="list-disc pl-5">
                      {p.data.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>,
                  ],
                  ["Durée de conservation", p.retention],
                  ["Destinataires", p.recipients],
                  ["Sécurité", p.security],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-ivory-3">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>
    </>
  );
}
