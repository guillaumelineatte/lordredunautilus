import type { Metadata } from "next";
import { GalleryManager } from "@/components/admin/gallery-manager";
import { PageHeader } from "@/components/admin/ui";
import type { SearchParams } from "@/components/admin/table";
import { eventOptions, listPhotos } from "@/server/queries/admin";

export const metadata: Metadata = { title: "Galerie" };

export default async function GalleryAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const eventId = typeof sp.evenement === "string" ? sp.evenement : undefined;
  const [photos, events] = await Promise.all([listPhotos(), eventOptions()]);
  const shown = eventId ? photos.filter((p) => p.eventId === eventId) : photos;

  return (
    <>
      <PageHeader
        kicker="Galerie"
        title="Les soirs de tables pleines"
        description="Déposez les photos, complétez la légende si besoin, puis publiez-les. Avant de publier, assurez-vous que les personnes reconnaissables sont d'accord (autorisation parentale signée pour un mineur)."
      />
      <GalleryManager
        key={eventId ?? "all"}
        eventId={eventId}
        photos={shown.map((p) => ({
          id: p.id,
          thumbUrl: p.thumbUrl,
          width: p.width,
          height: p.height,
          alt: p.alt,
          caption: p.caption,
          isPublished: p.isPublished,
          event: p.event ? { id: p.event.id, title: p.event.title } : null,
        }))}
        events={events.map((e) => ({
          id: e.id,
          title: `${e.title} (${e.startsAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })})`,
        }))}
      />
    </>
  );
}
