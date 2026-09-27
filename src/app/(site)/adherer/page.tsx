import type { Metadata } from "next";
import Link from "next/link";
import { Plans } from "@/components/site/plans";
import { formatAmount } from "@/lib/format";
import { RETENTION } from "@/lib/retention";
import { getGames, getPlans, getSettings } from "@/server/queries/public";
import { CopyButton } from "./copy-button";

export const metadata: Metadata = {
  title: "Adhérer à l'association",
  description:
    "Comment adhérer à L'Ordre du Nautilus : choisissez votre formule, envoyez le montant par PayPal, recevez votre carte de membre à votre prochaine venue.",
  alternates: { canonical: "/adherer" },
};

export const revalidate = 3600;

export default async function JoinPage() {
  const [plans, settings, games] = await Promise.all([getPlans(), getSettings(), getGames()]);
  const paid = plans.filter((p) => p.kind === "MEMBERSHIP");
  const idLabels = games.map((g) => g.playerIdLabel).join(", ");
  const note = "Prénom Nom — formule — identifiant(s) de jeu";

  return (
    <section className="page join-page" aria-labelledby="join-title">
      <div className="wrap">
        <Link className="back" href="/">
          ← Retour à l&apos;accueil
        </Link>
        <p className="kicker">Adhésion</p>
        <h2 id="join-title">Rejoindre l&apos;équipage</h2>
        <p className="lead" style={{ marginTop: "1rem" }}>
          L&apos;adhésion se règle par PayPal, en dehors du site. Aucun paiement n&apos;est demandé
          ici, et aucun compte n&apos;est à créer.
        </p>

        <div style={{ marginTop: "3rem" }}>
          <Plans plans={plans} onJoinPage />
        </div>
        {settings.membershipNote ? <p className="join-note">{settings.membershipNote}</p> : null}

        <div className="grid-2" id="etapes">
          <div>
            <p className="kicker">Marche à suivre</p>
            <h2>Trois étapes, et c&apos;est réglé.</h2>
            <ol className="steps">
              <li>
                <div>
                  <h3>Envoyez le montant de votre formule</h3>
                  <p>
                    {paid.map((p, i) => (
                      <span key={p.id}>
                        {p.name} : <strong>{formatAmount(p.priceCents)} €</strong>
                        {p.reducedPriceCents != null
                          ? ` (tarif réduit ${formatAmount(p.reducedPriceCents)} €)`
                          : ""}
                        {i < paid.length - 1 ? " · " : ""}
                      </span>
                    ))}
                  </p>
                  <p>Par PayPal, en « envoi à un proche » si possible, à l&apos;adresse :</p>
                  <div className="copy-line">
                    <code>{settings.paypal.address}</code>
                    <CopyButton value={settings.paypal.address} />
                    {settings.paypal.link ? (
                      <a
                        className="btn btn-ghost btn-small"
                        href={settings.paypal.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ouvrir PayPal
                      </a>
                    ) : null}
                  </div>
                </div>
              </li>
              <li>
                <div>
                  <h3>Indiquez en note qui vous êtes</h3>
                  <p>
                    Dans le message PayPal : votre prénom, votre nom et votre (vos) identifiant(s)
                    de jeu{idLabels ? ` (${idLabels})` : ""}.
                  </p>
                  <div className="copy-line">
                    <code>{note}</code>
                    <CopyButton value={note} />
                  </div>
                </div>
              </li>
              <li>
                <div>
                  <h3>Récupérez votre carte au local</h3>
                  <p>
                    L&apos;équipe enregistre votre adhésion à réception du paiement et vous remet
                    votre carte de membre en main propre lors de votre prochaine venue.
                  </p>
                </div>
              </li>
            </ol>
          </div>
          <aside>
            <div className="notice">
              <strong>Moins de 18 ans ?</strong> Une autorisation parentale signée est nécessaire :
              l&apos;équipe vous la remettra au local, à rapporter signée.
            </div>
            <div className="notice">
              <strong>Vos données.</strong> L&apos;association conserve uniquement : nom, prénom,
              identifiant(s) de jeu, périodes d&apos;adhésion, numéro de carte, une case « mineur »
              le cas échéant, et vos choix concernant les photos. Ni adresse, ni téléphone, ni
              e-mail. Conservation : {RETENTION.memberYears} ans après votre dernière adhésion, puis
              anonymisation.{" "}
              <Link href="/confidentialite" style={{ textDecoration: "underline" }}>
                En savoir plus
              </Link>
              .
            </div>
            <div className="notice">
              <strong>Première fois ?</strong> Venez d&apos;abord à une{" "}
              <Link href="/evenements?type=decouverte" style={{ textDecoration: "underline" }}>
                soirée découverte
              </Link>
              : c&apos;est gratuit, et on vous prête un deck.
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
