import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/server/queries/public";

export const metadata: Metadata = {
  title: "Mentions légales",
  alternates: { canonical: "/mentions-legales" },
};
export const revalidate = 3600;

export default async function LegalPage() {
  const { legal, contactEmail } = await getSettings();
  return (
    <section className="page" id="page-mentions" aria-labelledby="ml-title">
      <div className="wrap">
        <Link className="back" href="/">
          ← Retour à l&apos;accueil
        </Link>
        <p className="kicker">Mentions légales</p>
        <h2 id="ml-title">Informations légales</h2>
        <div className="legal" style={{ marginTop: "2rem" }}>
          <h3>Éditeur</h3>
          <p>
            {legal.associationName}, association loi 1901 déclarée en préfecture de la Somme sous le
            numéro {legal.rna}. Siège : {legal.siege}. Représentée par {legal.president},
            président·e. Directeur·rice de la publication : {legal.publicationDirector}. Contact :{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
          <h3>Hébergement</h3>
          <p>
            {legal.hostName}, {legal.hostAddress}.
          </p>
          <h3>Données personnelles</h3>
          <p>
            L&apos;association ne collecte que les données nécessaires à son fonctionnement et ne
            dépose aucun cookie de suivi. Le détail des traitements, des durées de conservation et
            de vos droits figure dans la{" "}
            <Link href="/confidentialite">politique de confidentialité</Link>.
          </p>
          <h3>Propriété intellectuelle</h3>
          <p>
            Le logo et les textes de ce site appartiennent à l&apos;association. Les noms des jeux
            cités sont des marques déposées par leurs éditeurs respectifs ; l&apos;association
            n&apos;est affiliée à aucun d&apos;eux.
          </p>
        </div>
      </div>
    </section>
  );
}
