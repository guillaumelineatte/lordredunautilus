import path from "node:path";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Next injecte des scripts inline pour l'hydratation : sans nonce, 'unsafe-inline'
// reste nécessaire. Tout le reste est verrouillé sur l'origine du site.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Racine explicite : un package-lock.json parasite dans un dossier parent ne doit rien changer.
  turbopack: { root: path.resolve(".") },
  serverExternalPackages: ["@react-pdf/renderer", "sharp", "@node-rs/argon2"],
  // Polices et logo lus sur disque par la génération des PDF
  outputFileTracingIncludes: {
    "/api/timonerie/pdf/[document]": ["./assets/fonts/**", "./public/logo.png"],
  },
  experimental: {
    globalNotFound: true,
    // CSS du site (≈ 7 Ko compressés) inliné dans le <head> : plus de requête bloquante.
    inlineCss: true,
    serverActions: {
      // Scans d'autorisation parentale (5 Mo max) + marge multipart
      bodySizeLimit: "6mb",
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    localPatterns: [
      { pathname: "/uploads/**", search: "" },
      { pathname: "/logo.png", search: "" },
      { pathname: "/demo/**", search: "" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
