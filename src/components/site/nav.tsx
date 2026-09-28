"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import { getLenis } from "./site-effects";

const LINKS = [
  { id: "ordre", label: "L'Ordre" },
  { id: "jeux", label: "Les jeux" },
  { id: "soirees", label: "Soirées" },
  { id: "adhesion", label: "Adhésion" },
  { id: "contact", label: "Contact" },
];

// scroll doux vers l'ancre si on est sur l'accueil, sinon navigation normale
export function useAnchorScroll() {
  const pathname = usePathname();
  return (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (pathname !== "/") return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    history.pushState(null, "", `#${id}`);
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target, { offset: -80 });
    else target.scrollIntoView({ behavior: "smooth" });
  };
}

export function Nav() {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const onAnchor = useAnchorScroll();
  const open = openOn === pathname;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // section active (accueil)
  useEffect(() => {
    if (pathname !== "/") return;
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter((s): s is HTMLElement =>
      Boolean(s),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => {
      observer.disconnect();
      setActive(null);
    };
  }, [pathname]);

  const close = () => setOpenOn(null);

  return (
    <header className={clsx("nav", (scrolled || pathname !== "/") && "scrolled")} id="nav">
      <div className="wrap">
        <Link className="brand" href="/" onClick={close}>
          <Image src="/logo.png" alt="" width={42} height={42} data-logo="" />
          <span>
            L&apos;Ordre du <b>Nautilus</b>
          </span>
        </Link>
        <ul className={clsx("nav-links", open && "open")} id="navlinks">
          {LINKS.map((l) => (
            <li key={l.id}>
              <Link
                href={`/#${l.id}`}
                className={active === l.id ? "active" : undefined}
                onClick={(e) => {
                  close();
                  onAnchor(e, l.id);
                }}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="nav-cta">
          <Link className="btn btn-primary btn-small magnetic" href="/adherer">
            Adhérer
          </Link>
          <button
            type="button"
            className={clsx("burger", open && "open")}
            id="burger"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="navlinks"
            onClick={() => setOpenOn(open ? null : pathname)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
