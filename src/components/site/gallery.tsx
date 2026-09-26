"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PhotoDTO } from "@/lib/dto";

/** Mosaïque de photos + visionneuse (clavier : ←, →, Échap). */
export function Gallery({
  photos,
  className = "masonry reveal",
}: {
  photos: PhotoDTO[];
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const current = index !== null ? photos[index] : null;

  const open = (i: number) => {
    setIndex(i);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();
  const step = useCallback(
    (delta: number) =>
      setIndex((i) => (i === null ? i : (i + delta + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    d.addEventListener("keydown", onKey);
    return () => d.removeEventListener("keydown", onKey);
  }, [step]);

  if (photos.length === 0) {
    return <div className="empty">Les premières photos arrivent bientôt.</div>;
  }

  return (
    <>
      <div className={className}>
        {photos.map((p, i) => (
          <figure key={p.id}>
            <button type="button" onClick={() => open(i)} aria-label={`Agrandir : ${p.alt}`}>
              <Image
                src={p.mediumUrl}
                alt={p.alt}
                width={p.width}
                height={p.height}
                sizes="(max-width: 500px) 100vw, (max-width: 800px) 50vw, 380px"
                placeholder={p.blurDataUrl ? "blur" : "empty"}
                blurDataURL={p.blurDataUrl ?? undefined}
              />
            </button>
            {p.caption ? <figcaption>{p.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
      <dialog
        id="lightbox"
        ref={dialog}
        aria-label="Visionneuse de photos"
        onClose={() => setIndex(null)}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
      >
        <button type="button" className="close" onClick={close}>
          Fermer ✕
        </button>
        {current ? (
          <>
            <div className="frame photo">
              <Image
                src={current.largeUrl}
                alt={current.alt}
                width={current.width}
                height={current.height}
                sizes="(max-width: 1000px) 92vw, 900px"
              />
            </div>
            {current.caption || current.event ? (
              <p className="lb-cap">
                {[current.caption, current.event?.title].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  className="lb-nav lb-prev"
                  aria-label="Photo précédente"
                  onClick={() => step(-1)}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="lb-nav lb-next"
                  aria-label="Photo suivante"
                  onClick={() => step(1)}
                >
                  →
                </button>
              </>
            ) : null}
          </>
        ) : null}
      </dialog>
    </>
  );
}
