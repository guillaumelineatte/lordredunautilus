import "dotenv/config";
import { defineConfig } from "prisma/config";

// La CLI (migrate, studio, seed) utilise la connexion directe Neon,
// l'appli passe par l'url poolée (voir src/server/db.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url:
      process.env.DIRECT_URL ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
});
