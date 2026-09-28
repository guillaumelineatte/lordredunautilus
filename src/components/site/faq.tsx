"use client";

import { gsap } from "gsap";
import { useRef, type MouseEvent, type ReactNode } from "react";

// accordéon animé avec GSAP (sans anim si l'utilisateur a réduit les animations)
export function FaqList({
  items,
}: {
  items: { id: string; question: string; answer: ReactNode }[];
}) {
  const root = useRef<HTMLDivElement>(null);

  function toggle(e: MouseEvent<HTMLElement>) {
    const details = e.currentTarget.parentElement as HTMLDetailsElement | null;
    const body = details?.querySelector<HTMLElement>(".body");
    if (!details || !body) return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (details.open) {
      if (reduce) {
        details.open = false;
        body.style.height = "0px";
      } else {
        gsap.to(body, {
          height: 0,
          duration: 0.4,
          ease: "power3.inOut",
          onComplete: () => void (details.open = false),
        });
      }
    } else {
      details.open = true;
      if (reduce) body.style.height = "auto";
      else gsap.fromTo(body, { height: 0 }, { height: "auto", duration: 0.5, ease: "power3.out" });
    }
  }

  return (
    <div className="reveal" id="faqlist" ref={root}>
      {items.map((item) => (
        <details key={item.id}>
          <summary onClick={toggle}>
            {item.question}
            <i />
          </summary>
          <div className="body">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}
