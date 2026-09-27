import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { RegistrationSource } from "@/generated/prisma/enums";
import { formatEventDate, formatHour } from "@/lib/format";
import { capitalize, dedupeKey, matchesPattern } from "@/lib/text";
import type { Tx } from "../db";
import { fail } from "../service/errors";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Verrou ligne sur l'événement : sérialise les inscriptions concurrentes. */
async function lockEvent(tx: Tx, eventId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
}

export async function countTaken(tx: Tx, eventId: string): Promise<number> {
  return tx.eventRegistration.count({
    where: { eventId, status: { in: ["REGISTERED", "PRESENT"] } },
  });
}

export type NewRegistration = {
  eventId: string;
  firstName: string;
  lastName: string;
  playerId: string | null;
  email: string | null;
  memberId?: string | null;
  source: RegistrationSource;
};

/**
 * Crée (ou réactive après annulation) une inscription. Anti-doublon nom + prénom
 * par événement ; bascule en liste d'attente si l'événement est complet.
 */
export async function createRegistration(tx: Tx, input: NewRegistration) {
  await lockEvent(tx, input.eventId);
  const event = await tx.event.findUnique({
    where: { id: input.eventId },
    include: {
      game: {
        select: { name: true, playerIdLabel: true, playerIdPattern: true, playerIdExample: true },
      },
    },
  });
  if (!event || event.deletedAt) fail("Événement introuvable.");
  if (input.source === "PUBLIC") {
    if (event.status !== "PUBLISHED")
      fail("Les inscriptions ne sont pas ouvertes pour cet événement.");
    if (event.startsAt <= new Date()) fail("Cet événement a déjà commencé.");
  }
  if (event.type === "OPEN_PLAY")
    fail("Pas d'inscription pour les soirées libres : venez directement !");

  if (event.game) {
    if (input.playerId && !matchesPattern(input.playerId, event.game.playerIdPattern)) {
      fail(`${event.game.playerIdLabel} invalide.`, {
        playerId: `Format attendu${event.game.playerIdExample ? ` : ${event.game.playerIdExample}` : " invalide"}.`,
      });
    }
    if (!input.playerId && event.type === "TOURNAMENT" && input.source === "PUBLIC") {
      fail("L'identifiant de jeu est nécessaire pour un tournoi.", {
        playerId: `Indiquez votre ${event.game.playerIdLabel}.`,
      });
    }
  }

  const firstName = capitalize(input.firstName);
  const lastName = capitalize(input.lastName);
  const key = dedupeKey(firstName, lastName);
  const existing = await tx.eventRegistration.findUnique({
    where: { eventId_dedupeKey: { eventId: event.id, dedupeKey: key } },
  });
  if (existing && existing.status !== "CANCELLED") {
    fail("Une inscription existe déjà à ce nom pour cet événement.");
  }

  const taken = await countTaken(tx, event.id);
  const status: "REGISTERED" | "WAITLISTED" =
    event.capacity != null && taken >= event.capacity ? "WAITLISTED" : "REGISTERED";
  const cancelToken = input.email ? randomBytes(24).toString("base64url") : null;

  const data = {
    firstName,
    lastName,
    dedupeKey: key,
    playerId: input.playerId,
    email: input.email,
    memberId: input.memberId ?? null,
    status,
    source: input.source,
    cancelTokenHash: cancelToken ? hashToken(cancelToken) : null,
    cancelledAt: null,
    checkedInAt: null,
  } as const;

  const registration = existing
    ? await tx.eventRegistration.update({ where: { id: existing.id }, data })
    : await tx.eventRegistration.create({ data: { ...data, eventId: event.id } });

  return { registration, event, status, cancelToken, wasFull: status === "WAITLISTED" };
}

export function describeEvent(
  e: { startsAt: Date; endsAt: Date | null; location: string | null },
  defaultPlace: string,
) {
  const when = `${formatEventDate(e.startsAt)} à ${formatHour(e.startsAt)}${e.endsAt ? ` – ${formatHour(e.endsAt)}` : ""}`;
  return { when, where: e.location ?? defaultPlace };
}
