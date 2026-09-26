import type { Metadata } from "next";
import { CancelButton } from "./cancel-button";

export const metadata: Metadata = { title: "Annuler mon inscription", robots: { index: false } };

// La page n'annule rien d'elle-même : un clic est nécessaire (les robots de
// prévisualisation des messageries ouvrent les liens des e-mails).
export default async function CancelPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="center-page">
      <div className="wrap">
        <p className="kicker">Inscription</p>
        <h2>Annuler ma place</h2>
        <p className="lead" style={{ marginInline: "auto" }}>
          Vous ne pouvez plus venir ? Libérez votre place : elle profitera à la première personne en
          liste d&apos;attente.
        </p>
        <CancelButton token={token} />
      </div>
    </main>
  );
}
