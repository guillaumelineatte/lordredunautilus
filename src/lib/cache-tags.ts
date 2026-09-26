/** Tags de cache des contenus publics, invalidés à chaque écriture admin. */
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
