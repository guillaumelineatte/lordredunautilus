import type { Metadata, Viewport } from "next";
import { Josefin_Sans, Source_Sans_3 } from "next/font/google";
import { Footer } from "@/components/site/footer";
import { JsonLd } from "@/components/site/json-ld";
import { Nav } from "@/components/site/nav";
import { SiteEffects } from "@/components/site/site-effects";
import { getSettings } from "@/server/queries/public";
import "lenis/dist/lenis.css";
import "./site.css";

const josefin = Josefin_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "600"],
  variable: "--font-josefin",
  display: "swap",
});
const source = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-source",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "L'Ordre du Nautilus — Association TCG à Amiens",
    template: "%s — L'Ordre du Nautilus",
  },
  description:
    "L'Ordre du Nautilus, association de jeux de cartes à collectionner à Amiens : Magic, Pokémon, Yu-Gi-Oh!, Lorcana, One Piece. Soirées découverte, tournois, adhésion.",
  openGraph: {
    title: "L'Ordre du Nautilus — TCG à Amiens",
    description:
      "Soirées Magic, Pokémon, Lorcana, One Piece et plus, chaque semaine à Amiens. Débutants bienvenus.",
    type: "website",
    locale: "fr_FR",
    siteName: "L'Ordre du Nautilus",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Logo de L'Ordre du Nautilus" }],
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#132438",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// posé avant le premier rendu : js actif, animations réduites, loader déjà vu
const INIT = `(function(){var d=document.documentElement;d.classList.add('js');try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('no-motion');if(sessionStorage.getItem('nautilus-loaded')==='1')d.classList.add('no-loader')}catch(e){}})();`;

// Les .reveal visibles au chargement sont animés en CSS tout de suite, sans
// attendre l'hydratation. GSAP prend le relais ensuite.
const REVEAL_NOW = `(function(){var d=document.documentElement;if(!d.classList.contains('js')||d.classList.contains('no-motion'))return;var h=innerHeight,i=0;document.querySelectorAll('.reveal').forEach(function(el){var r=el.getBoundingClientRect();if(r.top<h*0.95&&r.bottom>0){el.classList.add('reveal-now');el.style.animationDelay=(0.09*i++)+'s'}})})();`;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.legal.associationName,
    description: "Association de jeux de cartes à collectionner (TCG) à Amiens",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    email: settings.contactEmail,
    foundingDate: String(settings.foundedYear),
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.address.street,
      postalCode: settings.address.postalCode,
      addressLocality: settings.address.city,
      addressCountry: "FR",
    },
    sameAs: [
      settings.socials.discord,
      settings.socials.instagram,
      settings.socials.facebook,
    ].filter(Boolean),
  };

  return (
    <html lang="fr" className={`${josefin.variable} ${source.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INIT }} />
      </head>
      <body>
        <a className="skip-link" href="#contenu">
          Aller au contenu
        </a>
        <div id="loader" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-280.webp"
            alt=""
            width={140}
            height={140}
            data-logo=""
            fetchPriority="high"
          />
          <div className="bar">
            <i />
          </div>
        </div>
        <div id="cursor" />
        <div id="cursor-ring" />
        <Nav />
        <div id="contenu">{children}</div>
        <Footer />
        <script dangerouslySetInnerHTML={{ __html: REVEAL_NOW }} />
        <SiteEffects />
        <JsonLd data={organization} />
      </body>
    </html>
  );
}
