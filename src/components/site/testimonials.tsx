"use client";

import { useEffect, useState } from "react";
import type { TestimonialDTO } from "@/lib/dto";

// carrousel, pas de défilement auto si les animations sont réduites
export function Testimonials({ items }: { items: TestimonialDTO[] }) {
  const [slide, setSlide] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (items.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setSlide((s) => (s + 1) % items.length), 6500);
    return () => clearInterval(timer);
  }, [items.length, tick]);

  if (items.length === 0) return null;
  return (
    <div className="carousel reveal">
      <div
        className="slides"
        id="slides"
        style={{ transform: `translateX(-${slide * 100}%)` }}
        aria-live="polite"
      >
        {items.map((q, i) => (
          <figure className="slide" key={q.id} aria-hidden={i !== slide}>
            <p>« {q.quote} »</p>
            <footer>
              <b>{q.displayName}</b>, {q.context}
            </footer>
          </figure>
        ))}
      </div>
      {items.length > 1 ? (
        <div className="dots" id="dots" role="tablist" aria-label="Témoignages">
          {items.map((q, i) => (
            <button
              key={q.id}
              type="button"
              role="tab"
              aria-label={`Témoignage ${i + 1}`}
              aria-selected={i === slide}
              aria-current={i === slide}
              onClick={() => {
                setSlide(i);
                setTick((t) => t + 1);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
