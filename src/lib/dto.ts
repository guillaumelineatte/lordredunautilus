import type { EventType } from "@/generated/prisma/enums";

// Ce qui sort du cache Next est du JSON, donc pas de Date : que des chaînes ISO.

export type GameDTO = {
  id: string;
  name: string;
  slug: string;
  publisher: string;
  sigil: string;
  accentColor: string;
  usualDay: string;
  levels: string;
  formats: string[];
  playerIdLabel: string;
  playerIdPattern: string | null;
  playerIdExample: string | null;
};

export type EventDTO = {
  id: string;
  slug: string;
  title: string;
  type: EventType;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  description: string | null;
  capacity: number | null;
  priceCents: number | null;
  isHot: boolean;
  status: "PUBLISHED" | "CANCELLED" | "COMPLETED" | "DRAFT";
  game: Pick<
    GameDTO,
    "id" | "name" | "slug" | "playerIdLabel" | "playerIdPattern" | "playerIdExample"
  > | null;
  taken: number;
  waitlisted: number;
};

export type PhotoDTO = {
  id: string;
  thumbUrl: string;
  mediumUrl: string;
  largeUrl: string;
  width: number;
  height: number;
  blurDataUrl: string | null;
  alt: string;
  caption: string | null;
  event: { title: string; slug: string; startsAt: string } | null;
};

export type TestimonialDTO = { id: string; quote: string; displayName: string; context: string };
export type FaqDTO = { id: string; question: string; answer: string };

export type PlanDTO = {
  id: string;
  name: string;
  slug: string;
  kind: "DISCOVERY" | "MEMBERSHIP";
  priceCents: number;
  reducedPriceCents: number | null;
  periodLabel: string;
  durationDays: number | null;
  benefits: string[];
  isFeatured: boolean;
};

export type StatDTO = { label: string; value: number };

// null = pas de limite
export function placesLeft(e: Pick<EventDTO, "capacity" | "taken">): number | null {
  return e.capacity == null ? null : Math.max(0, e.capacity - e.taken);
}

export function acceptsRegistration(e: Pick<EventDTO, "type" | "status" | "startsAt">): boolean {
  return e.type !== "OPEN_PLAY" && e.status === "PUBLISHED" && new Date(e.startsAt) > new Date();
}
