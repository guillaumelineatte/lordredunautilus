import type { Metadata } from "next";
import { MemberForm } from "@/components/admin/member-form";
import { PageHeader } from "@/components/admin/ui";
import { gameOptions } from "@/server/queries/admin";

export const metadata: Metadata = { title: "Nouvel adhérent" };

export default async function NewMemberPage() {
  const games = await gameOptions();
  return (
    <>
      <PageHeader
        back={{ href: "/timonerie/adherents", label: "Adhérents" }}
        kicker="Adhérents"
        title="Nouvel adhérent"
        description="Créez la fiche, puis enregistrez l'adhésion depuis la fiche une fois le paiement PayPal reçu."
      />
      <MemberForm games={games} />
    </>
  );
}
