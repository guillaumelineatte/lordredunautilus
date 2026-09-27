import type { Metadata } from "next";
import { GamesEditor } from "@/components/admin/content-editors";
import { PageHeader } from "@/components/admin/ui";
import { gameOptions } from "@/server/queries/admin";

export const metadata: Metadata = { title: "Jeux" };

export default async function GamesPage() {
  const items = await gameOptions(true);
  return (
    <>
      <PageHeader
        kicker="Contenus"
        title="Jeux pratiqués"
        description="Le libellé et le format d'identifiant servent aux fiches adhérents et aux formulaires d'inscription."
      />
      <GamesEditor items={items} />
    </>
  );
}
