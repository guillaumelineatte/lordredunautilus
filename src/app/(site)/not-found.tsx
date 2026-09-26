import Link from "next/link";

export default function NotFound() {
  return (
    <main className="center-page">
      <div className="wrap">
        <p className="kicker">Erreur 404</p>
        <h1>Perdu dans les abysses.</h1>
        <p className="lead" style={{ marginInline: "auto" }}>
          Cette page n&apos;existe pas, ou plus. Remontons à la surface.
        </p>
        <Link className="btn btn-primary" href="/">
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
