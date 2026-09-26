import type { Metadata } from "next";
import Link from "next/link";
import { Markdown } from "@/components/site/markdown";
import { PROCESSINGS } from "@/lib/processing-register";
import { getSettings } from "@/server/queries/public";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  alternates: { canonical: "/confidentialite" },
};
export const revalidate = 3600;

export default async function PrivacyPage() {
  const settings = await getSettings();
  const { legal, contactEmail } = settings;
  const publicProcessings = PROCESSINGS.filter((p) => p.name !== "Journal d'administration");

  return (
    <section className="page" aria-labelledby="privacy-title">
      <div className="wrap">
        <Link className="back" href="/">
          ← Retour à l&apos;accueil
        </Link>
        <p className="kicker">Confidentialité</p>
        <h2 id="privacy-title">Vos données, et ce qu&apos;on en fait</h2>
        <div className="legal" style={{ marginTop: "2rem" }}>
          <h3>Responsable du traitement</h3>
          <p>
            {legal.associationName}, association loi 1901, {legal.siege}, représentée par{" "}
            {legal.president}. Pour toute question ou pour exercer vos droits :{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>

          <h3>Notre principe : le strict nécessaire</h3>
          <p>
            Pour un adhérent, l&apos;association conserve uniquement : nom, prénom, identifiant(s)
            de joueur par jeu, périodes d&apos;adhésion (début, fin, formule, renouvellement),
            numéro de carte physique, une case « mineur » et l&apos;année de naissance (jamais la
            date complète), et les autorisations relatives aux photos.{" "}
            <strong>Ni e-mail, ni téléphone, ni adresse.</strong> Aucun paiement n&apos;est traité
            sur le site : l&apos;adhésion se règle par PayPal, et seule la référence de la
            transaction peut être notée.
          </p>

          <h3>Finalités, bases légales et durées</h3>
          <table>
            <thead>
              <tr>
                <th scope="col">Traitement</th>
                <th scope="col">Base légale</th>
                <th scope="col">Données</th>
                <th scope="col">Durée</th>
              </tr>
            </thead>
            <tbody>
              {publicProcessings.map((p) => (
                <tr key={p.name}>
                  <td>
                    <strong>{p.name}</strong>
                    <br />
                    {p.purpose}
                  </td>
                  <td>{p.legalBasis}</td>
                  <td>{p.data.join(" ; ")}</td>
                  <td>{p.retention}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            En résumé : exécution du contrat d&apos;adhésion pour la gestion des membres ;
            consentement pour les photos (galerie et réseaux, séparément) ; intérêt légitime pour
            répondre aux messages et assurer la sécurité du site. À l&apos;issue des durées
            indiquées, les données sont supprimées ou anonymisées automatiquement.
          </p>

          <h3>Mineurs</h3>
          <p>
            L&apos;adhésion d&apos;un mineur nécessite une autorisation parentale signée, qui
            distingue trois accords : l&apos;adhésion elle-même, la publication de photos dans la
            galerie, et leur diffusion sur les réseaux. Une photo sur laquelle un mineur est
            identifiable n&apos;est publiée qu&apos;avec l&apos;autorisation écrite de son
            responsable légal.
          </p>

          <h3>Destinataires</h3>
          <p>
            Seul le bureau de l&apos;association accède aux données, via un compte administrateur
            unique protégé. Elles ne sont ni vendues, ni cédées. Prestataires techniques :
            hébergement du site et de la base de données ({legal.hostName}, Neon), envoi des e-mails
            de confirmation (Resend).
          </p>

          <h3>Vos droits</h3>
          <p>
            Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement et
            d&apos;opposition, ainsi que du droit de retirer à tout moment votre consentement aux
            photos. Écrivez à <a href={`mailto:${contactEmail}`}>{contactEmail}</a> ou adressez-vous
            au bureau lors d&apos;une soirée ; nous répondons sous un mois. Vous pouvez aussi
            introduire une réclamation auprès de la CNIL (www.cnil.fr).
          </p>

          <h3>Cookies</h3>
          <p>
            Ce site ne dépose <strong>aucun cookie de suivi</strong> ni de mesure d&apos;audience.
            Seul l&apos;espace d&apos;administration utilise un cookie de session, strictement
            nécessaire à la connexion.
          </p>

          {settings.privacyExtra ? <Markdown>{settings.privacyExtra}</Markdown> : null}
        </div>
      </div>
    </section>
  );
}
