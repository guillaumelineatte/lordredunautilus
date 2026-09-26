import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { parisTime } from "@/lib/dates";
import { db } from "../db";
import { env } from "../env";
import { rateLimit } from "../rate-limit";
import { metaFromHeaders } from "../request";
import { writeAudit } from "../service/audit";
import { lockUntil } from "./lockout";
import { hashPassword, verifyPassword } from "./password";

const LOGIN_PATHS = new Set([
  "/sign-in/email",
  "/two-factor/verify-totp",
  "/two-factor/verify-backup-code",
]);

/** Opérations de compte tracées dans le journal. */
const ACCOUNT_PATHS: Record<string, string> = {
  "/change-password": "Mot de passe modifié",
  "/two-factor/enable": "Activation de la double authentification demandée",
  "/two-factor/disable": "Double authentification désactivée",
  "/two-factor/generate-backup-codes": "Nouveaux codes de secours générés",
  "/revoke-session": "Session révoquée",
  "/revoke-other-sessions": "Autres sessions révoquées",
  "/revoke-sessions": "Toutes les sessions révoquées",
};

export const auth = betterAuth({
  appName: "L'Ordre du Nautilus",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.BETTER_AUTH_URL, env.NEXT_PUBLIC_SITE_URL],
  database: prismaAdapter(db, { provider: "postgresql" }),
  user: { modelName: "adminUser" },
  session: {
    modelName: "adminSession",
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  account: { modelName: "adminAccount" },
  verification: { modelName: "adminVerification" },
  emailAndPassword: {
    enabled: true,
    // Un seul compte, créé par le seed : aucune inscription possible.
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    password: { hash: hashPassword, verify: verifyPassword },
  },
  // Limitation de débit gérée par nos soins (en base, compatible serverless).
  rateLimit: { enabled: false },
  plugins: [
    twoFactor({ issuer: "L'Ordre du Nautilus", twoFactorTable: "adminTwoFactor" }),
    nextCookies(),
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (!LOGIN_PATHS.has(ctx.path)) return;
      const meta = metaFromHeaders(ctx.headers ?? new Headers());
      if (!(await rateLimit("login", meta.ip))) {
        throw new APIError("TOO_MANY_REQUESTS", {
          message: "Trop de tentatives depuis cette adresse. Réessayez dans quelques minutes.",
        });
      }
      const admin = await db.adminUser.findFirst({ select: { lockedUntil: true } });
      if (admin?.lockedUntil && admin.lockedUntil > new Date()) {
        throw new APIError("FORBIDDEN", {
          message: `Compte verrouillé après plusieurs échecs, jusqu'à ${parisTime(admin.lockedUntil)}.`,
        });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const operation = ACCOUNT_PATHS[ctx.path];
      if (operation) {
        if (!isAPIError(ctx.context.returned)) {
          const admin = await db.adminUser.findFirst({ select: { id: true } });
          await writeAudit(db, {
            action: "UPDATE",
            entity: "AdminUser",
            entityId: admin?.id ?? null,
            diff: { operation: { before: null, after: operation } },
            meta: metaFromHeaders(ctx.headers ?? new Headers()),
          });
        }
        return;
      }
      if (!LOGIN_PATHS.has(ctx.path)) return;
      const meta = metaFromHeaders(ctx.headers ?? new Headers());
      const newSession = ctx.context.newSession;

      if (newSession) {
        await db.adminUser.update({
          where: { id: newSession.user.id },
          data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
        });
        await writeAudit(db, {
          action: "LOGIN",
          entity: "AdminUser",
          entityId: newSession.user.id,
          meta,
        });
        return;
      }

      if (isAPIError(ctx.context.returned)) {
        const admin = await db.adminUser.findFirst({
          select: { id: true, failedLoginCount: true },
        });
        if (admin) {
          const failed = admin.failedLoginCount + 1;
          await db.adminUser.update({
            where: { id: admin.id },
            data: { failedLoginCount: failed, lockedUntil: lockUntil(failed) },
          });
        }
        await writeAudit(db, {
          action: "LOGIN_FAILED",
          entity: "AdminUser",
          entityId: admin?.id ?? null,
          diff: { etape: { before: null, after: ctx.path } },
          meta,
        });
      }
    }),
  },
});

export type AdminSession = typeof auth.$Infer.Session;
