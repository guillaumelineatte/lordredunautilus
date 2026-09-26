import type { Metadata } from "next";
import Link from "next/link";
import { Josefin_Sans, Source_Sans_3 } from "next/font/google";
import "./(site)/site.css";

const josefin = Josefin_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400"],
  variable: "--font-josefin",
});
const source = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-source",
});

export const metadata: Metadata = {
  title: "Page introuvable — L'Ordre du Nautilus",
  robots: { index: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="fr" className={`${josefin.variable} ${source.variable}`}>
      <body>
        <main className="notfound">
          <div className="wrap">
            <p className="kicker">Erreur 404</p>
            <h1>Perdu dans les abysses.</h1>
            <p className="lead">Cette page n&apos;existe pas, ou plus. Remontons à la surface.</p>
            <Link className="btn btn-primary" href="/">
              Retour à l&apos;accueil
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
