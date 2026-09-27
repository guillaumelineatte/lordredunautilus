import type { Metadata } from "next";
import { EventForm } from "@/components/admin/event-form";
import { PageHeader } from "@/components/admin/ui";
import { todayParis } from "@/lib/dates";
import { formatAddress } from "@/lib/settings";
import { gameOptions } from "@/server/queries/admin";
import { getSettings } from "@/server/queries/public";

export const metadata: Metadata = { title: "Nouvel événement" };

export default async function NewEventPage() {
  const [games, settings] = await Promise.all([gameOptions(), getSettings()]);
  return (
    <>
      <PageHeader
        back={{ href: "/timonerie/evenements", label: "Événements" }}
        kicker="Événements"
        title="Nouvel événement"
      />
      <div className="card p-5">
        <EventForm
          games={games}
          defaultLocation={formatAddress(settings.address)}
          initial={{
            title: "",
            gameId: null,
            type: "DISCOVERY",
            date: todayParis(),
            startTime: "19:00",
            endTime: "23:00",
            location: null,
            description: null,
            capacity: null,
            priceCents: null,
            isHot: false,
            status: "DRAFT",
          }}
        />
      </div>
    </>
  );
}
