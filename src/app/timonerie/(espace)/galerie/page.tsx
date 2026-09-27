import type { Metadata } from "next";
import { GalleryManager } from "@/components/admin/gallery-manager";
import { PageHeader } from "@/components/admin/ui";
import type { SearchParams } from "@/components/admin/table";
import { eventOptions, listPhotos, memberOptions } from "@/server/queries/admin";

export const metadata: Metadata = { title: "Galerie" };

export default async function GalleryAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const eventId = typeof sp.evenement === "string" ? sp.evenement : undefined;
  const [photos, members, events] = await Promise.all([
    listPhotos(),
    memberOptions(),
    eventOptions(),
  ]);
  const shown = eventId ? photos.filter((p) => p.eventId === eventId) : photos;

  return (
    <>
      <PageHeader
        kicker="Galerie"
        title="Les soirs de tables pleines"
        description="Une photo n'est publiable que si les droits à l'image ont été vérifiés et que chaque membre identifié a autorisé la galerie (pour un mineur : autorisation parentale signée, vérifiée en personne)."
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
          imageRightsChecked: p.imageRightsChecked,
          event: p.event ? { id: p.event.id, title: p.event.title } : null,
          taggedMembers: p.taggedMembers.map((m) => ({
            ...m,
            anonymizedAt: m.anonymizedAt?.toISOString() ?? null,
          })),
        }))}
        members={members.map((m) => ({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          imageRightsGallery: m.imageRightsGallery,
          imageRightsGallerySource: m.imageRightsGallerySource,
        }))}
        events={events.map((e) => ({
          id: e.id,
          title: `${e.title} (${e.startsAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })})`,
        }))}
      />
    </>
  );
}
