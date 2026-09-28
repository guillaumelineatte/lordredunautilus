import clsx from "clsx";
import Link from "next/link";
import type { PlanDTO } from "@/lib/dto";
import { formatAmount } from "@/lib/format";

// cartes des formules, même rendu que le site vitrine mais avec les données de la base
export function Plans({ plans, onJoinPage = false }: { plans: PlanDTO[]; onJoinPage?: boolean }) {
  return (
    <div className="plans">
      {plans.map((p) => {
        const discovery = p.kind === "DISCOVERY";
        const href = discovery
          ? "/evenements?type=decouverte"
          : onJoinPage
            ? `#etapes`
            : `/adherer?formule=${p.slug}`;
        const label = discovery
          ? "Choisir une soirée"
          : p.isFeatured
            ? "Adhérer"
            : p.priceCents > 5000
              ? "Soutenir l'association"
              : "Adhérer";
        return (
          <article key={p.id} className={clsx("plan", p.isFeatured && "featured", "reveal")}>
            {p.isFeatured ? <span className="ribbon">Le plus choisi</span> : null}
            <h3>{p.name}</h3>
            <div className="price">
              {formatAmount(p.priceCents)}
              <small>€ · {p.periodLabel}</small>
            </div>
            {p.reducedPriceCents != null ? (
              <p className="reduced">Tarif réduit : {formatAmount(p.reducedPriceCents)} €</p>
            ) : null}
            <ul>
              {p.benefits.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <Link
              className={`btn ${p.isFeatured ? "btn-primary" : "btn-ghost"} magnetic`}
              href={href}
            >
              {label}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
