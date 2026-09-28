import path from "node:path";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// 'unsafe-inline' obligatoire tant qu'on n'a pas de nonce (Next injecte des scripts
// inline pour l'hydratation). Le reste est limité à notre domaine.
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
  // sinon un package-lock.json dans un dossier parent perturbe turbopack
  turbopack: { root: path.resolve(".") },
  serverExternalPackages: ["@react-pdf/renderer", "sharp", "@node-rs/argon2"],
  // polices et logo lus sur le disque pour les PDF
  outputFileTracingIncludes: {
    "/api/timonerie/pdf/[document]": ["./assets/fonts/**", "./public/logo.png"],
  },
  experimental: {
    globalNotFound: true,
    // le CSS du site est petit (~7 Ko gzip), on l'inline dans le head
    inlineCss: true,
    serverActions: {
      // import CSV des adhérents (2 Mo max) + un peu de marge
      bodySizeLimit: "3mb",
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
