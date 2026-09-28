import "server-only";
import { updateTag } from "next/cache";
import { after } from "next/server";
import type { z } from "zod";
import { INVALID_FORM, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import type { CacheTag } from "@/lib/cache-tags";
import { getAdminSession } from "../auth/session";
import { db, type Tx } from "../db";
import { requestMeta, type RequestMeta } from "../request";
import { AuditRecorder } from "./audit";
import { DomainError } from "./errors";

export type AdminContext = {
  tx: Tx;
  audit: AuditRecorder;
  adminId: string;
  meta: RequestMeta;
  // lancé une fois la transaction commitée (mails, etc.)
  afterCommit: (effect: () => Promise<unknown>) => void;
};

type Options<S extends z.ZodType> = {
  schema: S;
  // tags du cache public à invalider après l'écriture
  tags?: CacheTag[];
};

function toPlain(raw: unknown): unknown {
  if (raw instanceof FormData) {
    const out: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
    for (const [key, value] of raw.entries()) {
      const existing = out[key];
      if (existing === undefined) out[key] = value;
      else out[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    }
    return out;
  }
  return raw;
}

// Toutes les server actions de l'admin passent par là : on vérifie la session,
// on valide avec zod, on écrit en transaction avec l'audit, puis on vide le cache.
export function adminAction<S extends z.ZodType, R>(
  options: Options<S>,
  handler: (input: z.output<S>, ctx: AdminContext) => Promise<R>,
): (input: z.input<S> | FormData) => Promise<ActionResult<R>> {
  return async (raw) => {
    const session = await getAdminSession();
    if (!session) {
      return { ok: false, error: "Votre session a expiré. Reconnectez-vous." };
    }

    const parsed = options.schema.safeParse(toPlain(raw));
    if (!parsed.success) {
      return { ok: false, error: INVALID_FORM, fieldErrors: zodFieldErrors(parsed.error) };
    }

    const meta = await requestMeta();
    const effects: (() => Promise<unknown>)[] = [];
    try {
      const data = await db.$transaction(
        async (tx) => {
          const audit = new AuditRecorder(tx, meta);
          return handler(parsed.data, {
            tx,
            audit,
            adminId: session.user.id,
            meta,
            afterCommit: (effect) => effects.push(effect),
          });
        },
        { maxWait: 10_000, timeout: 30_000 },
      );
      for (const tag of options.tags ?? []) updateTag(tag);
      if (effects.length > 0) {
        after(async () => {
          for (const effect of effects) {
            await effect().catch((e: unknown) => console.error("[afterCommit]", e));
          }
        });
      }
      return { ok: true, data };
    } catch (error) {
      if (error instanceof DomainError) {
        return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
      }
      if (isUniqueViolation(error)) {
        return { ok: false, error: "Cette valeur est déjà utilisée par un autre enregistrement." };
      }
      console.error("[adminAction]", error);
      return { ok: false, error: "Une erreur inattendue est survenue. Réessayez." };
    }
  };
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}
