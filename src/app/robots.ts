import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");
  return {
    // on ne cite pas /timonerie ici, pas la peine de la signaler
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api", "/inscription"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
