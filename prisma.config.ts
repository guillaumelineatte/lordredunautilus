import "dotenv/config";
import { defineConfig } from "prisma/config";

// La CLI (migrate, studio, seed) passe par la connexion directe Neon ;
// l'application utilise l'URL poolée via l'adaptateur pg (src/server/db.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
