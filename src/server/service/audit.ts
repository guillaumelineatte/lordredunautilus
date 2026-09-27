import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { AuditAction, AuditActor } from "@/generated/prisma/enums";
import type { Db, Tx } from "../db";
import type { RequestMeta } from "../request";

type Scalar = string | number | boolean | null;
export type DiffEntry = { before: Scalar; after: Scalar };
export type Diff = Record<string, DiffEntry>;

export const MASK = "[masqué]";

/**
 * Champs personnels dont la VALEUR n'est jamais écrite dans le journal :
 * on garde la trace qu'ils ont changé, pas leur contenu. Sans ce masquage,
 * une fiche anonymisée resterait lisible dans le journal immuable.
 */
export const PERSONAL_FIELDS: Record<string, readonly string[]> = {
  Member: ["firstName", "lastName", "cardNumber", "notes", "parentalDocumentFileId"],
  MemberGameId: ["value"],
  Membership: ["transactionRef"],
  EventRegistration: ["firstName", "lastName", "dedupeKey", "playerId", "email", "cancelTokenHash"],
  ContactMessage: ["firstName", "email", "message"],
  Testimonial: ["displayName"],
  AdminUser: ["email", "name"],
};

const IGNORED_FIELDS = new Set(["createdAt", "updatedAt"]);

function toScalar(value: unknown): Scalar | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) return "[fichier]";
  if (Array.isArray(value)) {
    // Tableaux de scalaires (formats, avantages…) ; les relations sont ignorées.
    return value.every((v) => typeof v !== "object") ? JSON.stringify(value) : undefined;
  }
  return undefined; // objets imbriqués = relations, ignorées
}

/** Diff champ à champ entre deux états, valeurs personnelles masquées. */
export function computeDiff(
  entity: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Diff {
  const personal = new Set(PERSONAL_FIELDS[entity] ?? []);
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const diff: Diff = {};
  for (const key of keys) {
    if (IGNORED_FIELDS.has(key)) continue;
    const b = toScalar(before?.[key]);
    const a = toScalar(after?.[key]);
    if (b === undefined && a === undefined) continue;
    const bv = b ?? null;
    const av = a ?? null;
    if (bv === av) continue;
    diff[key] = personal.has(key)
      ? { before: bv === null ? null : MASK, after: av === null ? null : MASK }
      : { before: bv, after: av };
  }
  return diff;
}

export type AuditInput = {
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  diff?: Diff | null;
  meta?: RequestMeta;
  actor?: AuditActor;
};

export async function writeAudit(client: Db | Tx, input: AuditInput): Promise<void> {
  const diff = input.diff && Object.keys(input.diff).length > 0 ? input.diff : null;
  await client.auditLog.create({
    data: {
      action: input.action,
      actor: input.actor ?? "ADMIN",
      entity: input.entity,
      entityId: input.entityId ?? null,
      diff: (diff ?? undefined) as Prisma.InputJsonValue | undefined,
      ip: input.meta?.ip ?? null,
      userAgent: input.meta?.userAgent ?? null,
    },
  });
}

type WithId = { id: string } & Record<string, unknown>;

/** Enregistreur lié à une transaction et à une requête : utilisé par toute la couche service. */
export class AuditRecorder {
  constructor(
    private readonly client: Db | Tx,
    private readonly meta: RequestMeta,
    private readonly actor: AuditActor = "ADMIN",
  ) {}

  log(action: AuditAction, entity: string, entityId?: string | null, diff?: Diff | null) {
    return writeAudit(this.client, {
      action,
      entity,
      entityId,
      diff,
      meta: this.meta,
      actor: this.actor,
    });
  }

  created(entity: string, record: WithId) {
    return this.log("CREATE", entity, record.id, computeDiff(entity, null, record));
  }

  updated(entity: string, before: WithId, after: WithId) {
    const diff = computeDiff(entity, before, after);
    if (Object.keys(diff).length === 0) return Promise.resolve();
    return this.log("UPDATE", entity, after.id, diff);
  }

  deleted(entity: string, before: WithId) {
    return this.log("DELETE", entity, before.id, computeDiff(entity, before, null));
  }
}
