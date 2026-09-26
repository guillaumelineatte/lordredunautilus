import "server-only";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import type { EventType } from "@/generated/prisma/enums";
import { TAGS } from "@/lib/cache-tags";
import { todayParis, dayToDbDate } from "@/lib/dates";
import type {
  EventDTO,
  FaqDTO,
  GameDTO,
  PhotoDTO,
  PlanDTO,
  StatDTO,
  TestimonialDTO,
} from "@/lib/dto";
import type { Settings } from "@/lib/settings";
import { db } from "../db";
import { loadSettings } from "../settings";

// Les pages publiques sont régénérées au plus tard toutes les heures,
// et immédiatement après chaque écriture admin (updateTag).
const REVALIDATE = 3600;

export const getSettings = unstable_cache(
  async (): Promise<Settings> => loadSettings(db),
  ["settings"],
  { tags: [TAGS.settings], revalidate: REVALIDATE },
);

export const getGames = unstable_cache(
  async (): Promise<GameDTO[]> => {
    const games = await db.game.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return games.map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      publisher: g.publisher,
      sigil: g.sigil,
      accentColor: g.accentColor,
      usualDay: g.usualDay,
      levels: g.levels,
      formats: g.formats,
      playerIdLabel: g.playerIdLabel,
      playerIdPattern: g.playerIdPattern,
      playerIdExample: g.playerIdExample,
    }));
  },
  ["games"],
  { tags: [TAGS.games], revalidate: REVALIDATE },
);

const eventInclude = {
  game: {
    select: {
      id: true,
      name: true,
      slug: true,
      playerIdLabel: true,
      playerIdPattern: true,
      playerIdExample: true,
    },
  },
  registrations: { select: { status: true } },
} satisfies Prisma.EventInclude;

type EventRow = Prisma.EventGetPayload<{ include: typeof eventInclude }>;

function toEventDTO(e: EventRow): EventDTO {
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    type: e.type,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt?.toISOString() ?? null,
    location: e.location,
    description: e.description,
    capacity: e.capacity,
    priceCents: e.priceCents,
    isHot: e.isHot,
    status: e.status,
    game: e.game,
    taken: e.registrations.filter((r) => r.status === "REGISTERED" || r.status === "PRESENT")
      .length,
    waitlisted: e.registrations.filter((r) => r.status === "WAITLISTED").length,
  };
}

/** Événements publiés à venir (à partir d'aujourd'hui, heure de Paris). */
export const getUpcomingEvents = unstable_cache(
  async (
    filters: { limit?: number; game?: string; type?: EventType } = {},
  ): Promise<EventDTO[]> => {
    const events = await db.event.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        startsAt: { gte: dayToDbDate(todayParis()) },
        ...(filters.game ? { game: { slug: filters.game } } : {}),
        ...(filters.type ? { type: filters.type } : {}),
      },
      include: eventInclude,
      orderBy: { startsAt: "asc" },
      take: filters.limit,
    });
    return events.map(toEventDTO);
  },
  ["upcoming-events"],
  { tags: [TAGS.events], revalidate: REVALIDATE },
);

export const getEventBySlug = unstable_cache(
  async (slug: string): Promise<EventDTO | null> => {
    const e = await db.event.findFirst({
      where: { slug, deletedAt: null, status: { in: ["PUBLISHED", "CANCELLED", "COMPLETED"] } },
      include: eventInclude,
    });
    return e ? toEventDTO(e) : null;
  },
  ["event-by-slug"],
  { tags: [TAGS.events], revalidate: REVALIDATE },
);

export const getPublishedEventSlugs = unstable_cache(
  async (): Promise<{ slug: string; updatedAt: string }[]> => {
    const rows = await db.event.findMany({
      where: { status: { in: ["PUBLISHED", "COMPLETED"] }, deletedAt: null },
      select: { slug: true, updatedAt: true },
      orderBy: { startsAt: "desc" },
      take: 500,
    });
    return rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.toISOString() }));
  },
  ["event-slugs"],
  { tags: [TAGS.events], revalidate: REVALIDATE },
);

export const getPhotos = unstable_cache(
  async (limit?: number): Promise<PhotoDTO[]> => {
    const photos = await db.photo.findMany({
      where: { isPublished: true, deletedAt: null },
      include: { event: { select: { title: true, slug: true, startsAt: true } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: limit,
    });
    return photos.map((p) => ({
      id: p.id,
      thumbUrl: p.thumbUrl,
      mediumUrl: p.mediumUrl,
      largeUrl: p.largeUrl,
      width: p.width,
      height: p.height,
      blurDataUrl: p.blurDataUrl,
      alt: p.alt,
      caption: p.caption,
      event: p.event ? { ...p.event, startsAt: p.event.startsAt.toISOString() } : null,
    }));
  },
  ["photos"],
  { tags: [TAGS.photos], revalidate: REVALIDATE },
);

export const getTestimonials = unstable_cache(
  async (): Promise<TestimonialDTO[]> =>
    db.testimonial.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, quote: true, displayName: true, context: true },
    }),
  ["testimonials"],
  { tags: [TAGS.testimonials], revalidate: REVALIDATE },
);

export const getFaq = unstable_cache(
  async (): Promise<FaqDTO[]> =>
    db.faqItem.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, question: true, answer: true },
    }),
  ["faq"],
  { tags: [TAGS.faq], revalidate: REVALIDATE },
);

export const getPlans = unstable_cache(
  async (): Promise<PlanDTO[]> => {
    const plans = await db.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }],
    });
    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      kind: p.kind,
      priceCents: p.priceCents,
      reducedPriceCents: p.reducedPriceCents,
      periodLabel: p.periodLabel,
      durationDays: p.durationDays,
      benefits: p.benefits,
      isFeatured: p.isFeatured,
    }));
  },
  ["plans"],
  { tags: [TAGS.plans], revalidate: REVALIDATE },
);

/** Chiffres clés : valeurs saisies, ou calculées (membres actifs, année de fondation). */
export const getStats = unstable_cache(
  async (): Promise<StatDTO[]> => {
    const settings = await loadSettings(db);
    const needsCount = settings.stats.some((s) => s.auto === "activeMembers");
    const activeMembers = needsCount
      ? await db.member.count({ where: { status: "ACTIVE", deletedAt: null, anonymizedAt: null } })
      : 0;
    return settings.stats.map((s) => ({
      label: s.label,
      value:
        s.auto === "activeMembers" && activeMembers > 0
          ? activeMembers
          : s.auto === "foundedYear"
            ? settings.foundedYear
            : s.value,
    }));
  },
  ["stats"],
  { tags: [TAGS.stats, TAGS.settings], revalidate: REVALIDATE },
);
