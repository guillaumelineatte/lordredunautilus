import type { MetadataRoute } from "next";
import { getPublishedEventSlugs } from "@/server/queries/public";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/evenements`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/adherer`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/galerie`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/confidentialite`, changeFrequency: "yearly", priority: 0.2 },
  ];
  let events: MetadataRoute.Sitemap = [];
  try {
    events = (await getPublishedEventSlugs()).map((e) => ({
      url: `${base}/evenements/${e.slug}`,
      lastModified: new Date(e.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch {
    // Base indisponible au build : le sitemap sera complété à la régénération.
  }
  return [...pages, ...events];
}
