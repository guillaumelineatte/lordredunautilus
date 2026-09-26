/**
 * Dépannage du compte administrateur, en ligne de commande (accès serveur requis).
 *
 *   npm run admin:reset                          → déverrouille le compte
 *   npm run admin:reset -- --password "…"        → + nouveau mot de passe (12 caractères min.)
 *   npm run admin:reset -- --generate            → + mot de passe aléatoire affiché une fois
 *   npm run admin:reset -- --disable-2fa         → + désactive la double authentification
 *
 * Toutes les sessions ouvertes sont fermées. L'opération est tracée dans le journal.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/server/auth/password";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const value = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  const db = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        process.env.DIRECT_URL ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
    }),
  });
  try {
    const admin = await db.adminUser.findFirst();
    if (!admin)
      throw new Error("Aucun compte administrateur : lancez d'abord « npm run db:seed ».");

    let password = value("--password");
    if (flag("--generate")) password = randomBytes(15).toString("base64url");
    if (password !== undefined && password.length < 12)
      throw new Error("Le mot de passe doit contenir au moins 12 caractères.");

    const operations: string[] = ["compte déverrouillé"];
    await db.adminUser.update({
      where: { id: admin.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    if (password) {
      const hash = await hashPassword(password);
      const updated = await db.adminAccount.updateMany({
        where: { userId: admin.id, providerId: "credential" },
        data: { password: hash },
      });
      if (updated.count === 0) {
        await db.adminAccount.create({
          data: { userId: admin.id, accountId: admin.id, providerId: "credential", password: hash },
        });
      }
      operations.push("mot de passe remplacé");
    }

    if (flag("--disable-2fa")) {
      await db.adminTwoFactor.deleteMany({ where: { userId: admin.id } });
      await db.adminUser.update({ where: { id: admin.id }, data: { twoFactorEnabled: false } });
      operations.push("double authentification désactivée");
    }

    const sessions = await db.adminSession.deleteMany({ where: { userId: admin.id } });
    operations.push(`${sessions.count} session(s) fermée(s)`);

    await db.auditLog.create({
      data: {
        action: "UPDATE",
        actor: "SYSTEM",
        entity: "AdminUser",
        entityId: admin.id,
        diff: {
          operation: {
            before: null,
            after: `Réinitialisation en ligne de commande : ${operations.join(", ")}`,
          },
        },
        userAgent: "scripts/admin-reset.ts",
      },
    });

    console.log(`✔ ${admin.email} : ${operations.join(", ")}.`);
    if (flag("--generate"))
      console.log(`  Nouveau mot de passe (à changer dès la connexion) : ${password}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
