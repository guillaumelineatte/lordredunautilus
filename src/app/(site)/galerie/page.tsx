import type { Metadata } from "next";
import Link from "next/link";
import { Gallery } from "@/components/site/gallery";
import type { PhotoDTO } from "@/lib/dto";
import { formatEventDate } from "@/lib/format";
import { getPhotos } from "@/server/queries/public";

export const metadata: Metadata = {
  title: "Galerie photo",
  description:
    "Les soirs de tables pleines : photos des soirées, tournois et week-ends de L'Ordre du Nautilus à Amiens.",
  alternates: { canonical: "/galerie" },
};

export const revalidate = 3600;

export default async function GalleryPage() {
  const photos = await getPhotos();
  // Regroupement par soirée ; les photos sans soirée forment le premier groupe.
  const groups = new Map<string, { title: string; date: string | null; photos: PhotoDTO[] }>();
  for (const p of photos) {
    const key = p.event?.slug ?? "_";
    const group = groups.get(key) ?? {
      title: p.event?.title ?? "La vie de l'association",
      date: p.event?.startsAt ?? null,
      photos: [],
    };
    group.photos.push(p);
    groups.set(key, group);
  }

  return (
    <section className="page gallery" aria-labelledby="gal-title">
      <div className="wrap">
        <Link className="back" href="/">
          ← Retour à l&apos;accueil
        </Link>
        <p className="kicker">Galerie</p>
        <h2 id="gal-title">Les soirs de tables pleines.</h2>
        {photos.length === 0 ? (
          <div className="empty" style={{ marginTop: "2rem" }}>
            Les premières photos arrivent bientôt.
          </div>
        ) : (
          [...groups.values()].map((g) => (
            <div className="gallery-group" key={g.title + (g.date ?? "")}>
              <h3>
                {g.title}
                {g.date ? <small>{formatEventDate(new Date(g.date))}</small> : null}
              </h3>
              <Gallery photos={g.photos} className="masonry" />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
