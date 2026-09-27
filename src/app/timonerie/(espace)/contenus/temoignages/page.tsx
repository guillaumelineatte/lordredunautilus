import type { Metadata } from "next";
import { TestimonialsEditor } from "@/components/admin/content-editors";
import { PageHeader } from "@/components/admin/ui";
import { listTestimonials } from "@/server/queries/admin";

export const metadata: Metadata = { title: "Témoignages" };

export default async function TestimonialsPage() {
  const items = await listTestimonials();
  return (
    <>
      <PageHeader
        kicker="Contenus"
        title="Témoignages"
        description="Affichés en carrousel sur l'accueil, dans l'ordre ci-dessous."
      />
      <TestimonialsEditor items={items} />
    </>
  );
}
