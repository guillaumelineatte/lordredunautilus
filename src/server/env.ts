import "server-only";
import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET doit faire au moins 32 caractères"),
  ADMIN_NOTIFY_EMAIL: optional,
  RESEND_API_KEY: optional,
  MAIL_FROM: z.string().default("L'Ordre du Nautilus <noreply@ordredunautilus.fr>"),
  BLOB_READ_WRITE_TOKEN: optional,
  DISCORD_WEBHOOK_URL: optional,
  CRON_SECRET: optional,
  IP_HASH_SECRET: z.string().min(16).default("dev-only-ip-hash-secret-change-me"),
});

export const env = schema.parse(process.env);

export const isProd = env.NODE_ENV === "production";
