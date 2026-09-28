// Tags du cache des pages publiques, vidés quand l'admin modifie quelque chose.
export const TAGS = {
  games: "games",
  events: "events",
  photos: "photos",
  testimonials: "testimonials",
  faq: "faq",
  plans: "plans",
  settings: "settings",
  stats: "stats",
} as const;

export type CacheTag = (typeof TAGS)[keyof typeof TAGS];
