import type { Metadata } from "next";
import { SettingsEditor } from "@/components/admin/settings-editor";
import { PageHeader } from "@/components/admin/ui";
import { adminSettings } from "@/server/queries/admin";

export const metadata: Metadata = { title: "Réglages du site" };

export default async function SettingsPage() {
  const settings = await adminSettings();
  return (
    <>
      <PageHeader
        kicker="Contenus"
        title="Réglages du site"
        description="Horaires, adresse, PayPal, chiffres clés, réseaux et textes légaux."
      />
      <SettingsEditor settings={settings} />
    </>
  );
}
