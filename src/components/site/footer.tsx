import Image from "next/image";
import Link from "next/link";
import { todayParis } from "@/lib/dates";

export function Footer() {
  const year = todayParis().slice(0, 4);
  return (
    <footer className="site">
      <div className="wrap">
        <Image src="/logo.png" alt="" width={64} height={64} data-logo="" />
        <nav aria-label="Pied de page">
          <Link href="/#ordre">L&apos;Ordre</Link>
          <Link href="/#jeux">Les jeux</Link>
          <Link href="/evenements">Agenda</Link>
          <Link href="/galerie">Galerie</Link>
          <Link href="/adherer">Adhésion</Link>
          <Link href="/#contact">Contact</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/confidentialite">Confidentialité</Link>
        </nav>
        <small>
          © {year} L&apos;Ordre du Nautilus
          <br />
          Fait à Amiens
        </small>
      </div>
    </footer>
  );
}
