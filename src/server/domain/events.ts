import "server-only";
import { parisToUtc } from "@/lib/dates";
import { slugify } from "@/lib/text";
import type { EventInput } from "@/lib/validation/schemas";
import type { Tx } from "../db";

// titre-aaaa-mm-jj, avec un suffixe si c'est déjà pris
export async function uniqueEventSlug(
  tx: Tx,
  title: string,
  day: string,
  excludeId?: string | null,
) {
  const base = slugify(`${title} ${day}`);
  let slug = base;
  for (let i = 2; i < 100; i++) {
    const clash = await tx.event.findUnique({ where: { slug }, select: { id: true } });
    if (!clash || clash.id === excludeId) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

// convertit la saisie (jour + heures à Paris) en dates UTC
export function eventData(input: EventInput) {
  const startsAt = parisToUtc(input.date, input.startTime);
  let endsAt: Date | null = null;
  if (input.endTime) {
    endsAt = parisToUtc(input.date, input.endTime);
    // fin après minuit (00:30), donc le lendemain
    if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 86_400_000);
  }
  return {
    title: input.title,
    gameId: input.gameId,
    type: input.type,
    startsAt,
    endsAt,
    location: input.location,
    description: input.description,
    capacity: input.type === "OPEN_PLAY" ? null : input.capacity,
    priceCents: input.price,
    isHot: input.isHot,
  };
}
