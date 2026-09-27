import "server-only";
import { updateTag } from "next/cache";
import { after } from "next/server";
import { createElement } from "react";
import type { z } from "zod";
import { INVALID_FORM, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { TAGS } from "@/lib/cache-tags";
import { formatEventDate, formatHour } from "@/lib/format";
import { formatAddress } from "@/lib/settings";
import { fullName } from "@/lib/text";
import type { contactInput, publicRegistrationInput } from "@/lib/validation/schemas";
import { db } from "../db";
import { createRegistration, describeEvent, hashToken } from "../domain/registrations";
import { notifyAdmin, sendMail, siteUrl } from "../mail/send";
import { RegistrationEmail } from "../mail/templates";
import { rateLimit } from "../rate-limit";
import { requestMeta } from "../request";
import { loadSettings } from "../settings";
import { DomainError } from "./errors";

type RegistrationInput = z.output<typeof publicRegistrationInput>;
type ContactInput = z.output<typeof contactInput>;

const TOO_MANY = "Trop de demandes depuis votre connexion. Réessayez un peu plus tard.";

function handle(error: unknown): ActionResult<never> {
  if (error instanceof DomainError)
    return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
  console.error("[public]", error);
  return { ok: false, error: "Une erreur est survenue. Réessayez dans un instant." };
}

export function parseOrFail<S extends z.ZodType>(
  schema: S,
  raw: unknown,
): { ok: true; data: z.output<S> } | { ok: false; result: ActionResult<never> } {
  const input = raw instanceof FormData ? Object.fromEntries(raw.entries()) : raw;
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      result: { ok: false, error: INVALID_FORM, fieldErrors: zodFieldErrors(parsed.error) },
    };
  }
  return { ok: true, data: parsed.data };
}

/** Inscription publique à un événement (sans compte). */
export async function registerPublic(
  input: RegistrationInput,
): Promise<ActionResult<{ status: "REGISTERED" | "WAITLISTED"; emailSent: boolean }>> {
  const meta = await requestMeta();
  if (!(await rateLimit("registration", meta.ip))) return { ok: false, error: TOO_MANY };
  try {
    const result = await db.$transaction(
      (tx) =>
        createRegistration(tx, {
          eventId: input.eventId,
          firstName: input.firstName,
          lastName: input.lastName,
          playerId: input.playerId,
          email: input.email,
          source: "PUBLIC",
        }),
      { maxWait: 10_000, timeout: 20_000 },
    );
    updateTag(TAGS.events);

    const { registration, event, status, cancelToken, wasFull } = result;
    const settings = await loadSettings(db);
    const { when, where } = describeEvent(event, formatAddress(settings.address));
    const email = registration.email;
    after(async () => {
      if (email && cancelToken) {
        await sendMail(
          email,
          status === "WAITLISTED"
            ? `Liste d'attente : ${event.title}`
            : `Inscription confirmée : ${event.title}`,
          createElement(RegistrationEmail, {
            firstName: registration.firstName,
            eventTitle: event.title,
            when,
            where,
            status,
            cancelUrl: siteUrl(`/inscription/annuler/${cancelToken}`),
          }),
        );
      }
      if (wasFull) {
        await notifyAdmin(`Inscription sur un événement complet : ${event.title}`, {
          title: "Inscription en liste d'attente",
          intro: `${fullName(registration)} s'est inscrit·e à « ${event.title} » (${formatEventDate(event.startsAt)} à ${formatHour(event.startsAt)}), qui est complet. Cette personne est en liste d'attente.`,
          cta: { label: "Voir les inscrits", href: siteUrl(`/timonerie/evenements/${event.id}`) },
        });
      }
    });
    return { ok: true, data: { status, emailSent: Boolean(email) } };
  } catch (error) {
    return handle(error);
  }
}

/** Annulation via le lien reçu par e-mail. */
export async function cancelByToken(token: string): Promise<ActionResult<{ eventTitle: string }>> {
  const meta = await requestMeta();
  if (!(await rateLimit("cancellation", meta.ip))) return { ok: false, error: TOO_MANY };
  try {
    const reg = await db.eventRegistration.findUnique({
      where: { cancelTokenHash: hashToken(token) },
      include: { event: true },
    });
    if (!reg) return { ok: false, error: "Ce lien d'annulation n'est plus valable." };
    if (reg.status === "CANCELLED") return { ok: true, data: { eventTitle: reg.event.title } };
    if (reg.event.startsAt <= new Date()) {
      return {
        ok: false,
        error:
          "L'événement a déjà commencé : prévenez directement l'équipe sur place ou sur Discord.",
      };
    }
    await db.eventRegistration.update({
      where: { id: reg.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    updateTag(TAGS.events);
    const waiting = await db.eventRegistration.count({
      where: { eventId: reg.eventId, status: "WAITLISTED" },
    });
    if (waiting > 0 && reg.status === "REGISTERED") {
      after(() =>
        notifyAdmin(`Place libérée : ${reg.event.title}`, {
          title: "Une place s'est libérée",
          intro: `${fullName(reg)} a annulé son inscription à « ${reg.event.title} ». ${waiting} personne(s) en liste d'attente : vous pouvez promouvoir la suivante.`,
          cta: {
            label: "Gérer les inscrits",
            href: siteUrl(`/timonerie/evenements/${reg.eventId}`),
          },
        }),
      );
    }
    return { ok: true, data: { eventTitle: reg.event.title } };
  } catch (error) {
    return handle(error);
  }
}

export async function submitContact(input: ContactInput): Promise<ActionResult<{ email: string }>> {
  const meta = await requestMeta();
  if (!(await rateLimit("contact", meta.ip))) return { ok: false, error: TOO_MANY };
  try {
    const message = await db.contactMessage.create({
      data: {
        firstName: input.firstName,
        email: input.email,
        game: input.game,
        message: input.message,
      },
    });
    after(() =>
      notifyAdmin(`Nouveau message de ${message.firstName}`, {
        title: "Nouveau message de contact",
        intro: `${message.firstName} (${message.email})${message.game ? `, intéressé·e par ${message.game}` : ""}, a écrit :`,
        sections: [{ heading: "Message", items: [message.message] }],
        cta: { label: "Ouvrir la boîte de réception", href: siteUrl("/timonerie/messages") },
      }),
    );
    return { ok: true, data: { email: message.email } };
  } catch (error) {
    return handle(error);
  }
}
