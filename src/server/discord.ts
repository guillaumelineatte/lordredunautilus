import "server-only";
import { formatEventDate, formatHour } from "@/lib/format";
import { db } from "./db";
import { env } from "./env";
import { siteUrl } from "./mail/send";
import { loadSettings } from "./settings";

/** Annonce un événement publié sur le salon Discord (si activé dans les réglages). */
export async function announceEventOnDiscord(eventId: string): Promise<void> {
  if (!env.DISCORD_WEBHOOK_URL) return;
  const settings = await loadSettings(db);
  if (!settings.features.discordWebhook) return;
  const event = await db.event.findUnique({ where: { id: eventId }, include: { game: true } });
  if (!event || event.status !== "PUBLISHED" || event.discordPostedAt) return;

  const res = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "L'Ordre du Nautilus",
      embeds: [
        {
          title: event.title,
          url: siteUrl(`/evenements/${event.slug}`),
          description: `${event.game ? `${event.game.name} — ` : ""}${formatEventDate(event.startsAt)} à ${formatHour(event.startsAt)}`,
          color: 0xdda5a7,
        },
      ],
    }),
  });
  if (res.ok) {
    await db.event.update({ where: { id: eventId }, data: { discordPostedAt: new Date() } });
  } else {
    console.error("[discord]", res.status, await res.text());
  }
}
