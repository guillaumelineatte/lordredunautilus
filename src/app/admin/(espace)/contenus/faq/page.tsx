import type { Metadata } from "next";
import { FaqEditor } from "@/components/admin/content-editors";
import { PageHeader } from "@/components/admin/ui";
import { listFaq } from "@/server/queries/admin";

export const metadata: Metadata = { title: "FAQ" };

export default async function FaqPage() {
  const items = await listFaq();
  return (
    <>
      <PageHeader kicker="Contenus" title="Questions fréquentes" />
      <FaqEditor items={items} />
    </>
  );
}
