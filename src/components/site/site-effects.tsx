"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

export function getLenis() {
  return lenis;
}

const $$ = <T extends Element = HTMLElement>(sel: string, ctx: ParentNode = document) =>
  Array.from(ctx.querySelectorAll<T>(sel)) as T[];

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// scroll doux Lenis calé sur le ticker GSAP, créé une seule fois
function initLenis() {
  if (lenis || reducedMotion()) return;
  try {
    lenis = new Lenis({ lerp: 0.18, wheelMultiplier: 1, smoothWheel: true, syncTouch: false });
    lenis.on("scroll", () => ScrollTrigger.update());
    gsap.ticker.add((t) => lenis?.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } catch {
    lenis = null;
  }
}

// apparitions au scroll, compteurs, parallaxe du hublot, recul du hero
function scrollFx() {
  if (reducedMotion()) {
    gsap.set(".reveal", { opacity: 1, y: 0 });
    $$("[data-count]").forEach((el) => (el.textContent = el.dataset.count ?? el.textContent));
    return;
  }
  $$("section, .marquee").forEach((sec) => {
    const items = $$(".reveal", sec).filter(
      (el) => el.closest("section, .marquee") === sec && !el.classList.contains("reveal-now"),
    );
    if (!items.length) return;
    gsap.to(items, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power3.out",
      stagger: 0.09,
      scrollTrigger: { trigger: sec, start: "top 78%", once: true },
    });
  });
  $$("[data-count]").forEach((el) => {
    const end = Number(el.dataset.count ?? 0);
    const o = { v: 0 };
    gsap.to(o, {
      v: end,
      duration: 1.8,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
      onUpdate: () => {
        el.textContent = String(Math.round(o.v));
      },
    });
  });
  $$("[data-parallax]").forEach((el) => {
    gsap.to(el, {
      yPercent: -8,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.4 },
    });
    const inner = el.querySelector("[data-parallax-inner]");
    if (inner)
      gsap.to(inner, {
        yPercent: 12,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.4 },
      });
  });
  if (document.querySelector(".hero")) {
    gsap.to(".hero .wrap", {
      yPercent: 14,
      opacity: 0.3,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.4 },
    });
  }
}

// cartes qui s'inclinent, boutons aimantés, curseur perso (souris seulement)
function pointerFx(): () => void {
  const cleanups: (() => void)[] = [];
  const on = <K extends keyof HTMLElementEventMap>(
    el: HTMLElement | Window,
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
  ) => {
    el.addEventListener(type, fn as EventListener, { passive: true });
    cleanups.push(() => el.removeEventListener(type, fn as EventListener));
  };
  const cursor = document.getElementById("cursor");
  const ring = document.getElementById("cursor-ring");
  if (reducedMotion() || !window.matchMedia("(pointer:fine)").matches) {
    cursor?.style.setProperty("display", "none");
    ring?.style.setProperty("display", "none");
    return () => undefined;
  }

  $$(".game").forEach((card) => {
    on(card, "pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.style.setProperty("--mx", `${x * 100}%`);
      card.style.setProperty("--my", `${y * 100}%`);
      gsap.to(card, {
        rotateY: (x - 0.5) * 14,
        rotateX: (0.5 - y) * 12,
        duration: 0.5,
        ease: "power2.out",
        transformPerspective: 900,
      });
    });
    on(card, "pointerleave", () =>
      gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.8, ease: "elastic.out(1,.5)" }),
    );
  });

  $$(".magnetic").forEach((b) => {
    on(b, "pointermove", (e) => {
      const r = b.getBoundingClientRect();
      gsap.to(b, {
        x: (e.clientX - r.left - r.width / 2) * 0.28,
        y: (e.clientY - r.top - r.height / 2) * 0.4,
        duration: 0.4,
        ease: "power2.out",
      });
    });
    on(b, "pointerleave", () =>
      gsap.to(b, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1,.4)" }),
    );
  });

  if (cursor && ring) {
    const qx = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3" });
    const qy = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3" });
    on(window, "pointermove", (e) => {
      gsap.set(cursor, { x: e.clientX, y: e.clientY });
      qx(e.clientX);
      qy(e.clientY);
    });
    $$("a,button,summary,.game,.masonry figure").forEach((el) => {
      on(el, "pointerenter", () => document.body.classList.add("hovering"));
      on(el, "pointerleave", () => document.body.classList.remove("hovering"));
    });
  }
  return () => {
    cleanups.forEach((c) => c());
    document.body.classList.remove("hovering");
  };
}

// le loader ne se rejoue pas pendant la session
function markLoaderSeen() {
  try {
    sessionStorage.setItem("nautilus-loaded", "1");
  } catch {
    /* navigation privée, pas grave */
  }
}

let firstRun = true;

// toutes les anims du site, relancées à chaque changement de page
export function SiteEffects() {
  const pathname = usePathname();

  useEffect(() => {
    if (!firstRun) initLenis();
    let cleanupPointer = () => undefined as void;
    const ctx = gsap.context(() => undefined);

    const start = () => {
      ctx.add(() => scrollFx());
      cleanupPointer = pointerFx();
      // ancre éventuelle (/#adhesion) après la navigation
      if (window.location.hash) {
        const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
        if (target)
          setTimeout(
            () => (lenis ? lenis.scrollTo(target, { offset: -80 }) : target.scrollIntoView()),
            60,
          );
      }
      setTimeout(() => ScrollTrigger.refresh(), 120);
    };

    let idleId: number | undefined;
    if (firstRun) {
      firstRun = false;
      markLoaderSeen();
      // au premier chargement on attend un moment libre pour ne pas ralentir
      // l'hydratation, le haut de page est déjà animé en CSS
      const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
      idleId = idle(
        () => {
          initLenis();
          start();
        },
        { timeout: 1500 },
      );
    } else {
      if (!window.location.hash) {
        if (lenis) lenis.scrollTo(0, { immediate: true });
        else window.scrollTo(0, 0);
      }
      start();
    }

    return () => {
      if (idleId !== undefined) (window.cancelIdleCallback ?? window.clearTimeout)(idleId);
      ctx.revert();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      cleanupPointer();
    };
  }, [pathname]);

  return null;
}
