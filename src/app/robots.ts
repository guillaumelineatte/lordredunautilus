import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");
  return {
    // L'administration n'est pas citée : elle doit rester introuvable.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api", "/inscription"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
