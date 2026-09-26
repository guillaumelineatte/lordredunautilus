"use server";

import { createElement } from "react";
import { z } from "zod";
import { TAGS } from "@/lib/cache-tags";
import { addDays, parisDay } from "@/lib/dates";
import { formatAddress } from "@/lib/settings";
import {
  adminRegistrationInput,
  eventInput,
  idInput,
  linkMemberInput,
  presenceInput,
} from "@/lib/validation/schemas";
import { announceEventOnDiscord } from "../discord";
import { eventData, uniqueEventSlug } from "../domain/events";
import { countTaken, createRegistration, describeEvent } from "../domain/registrations";
import { sendMail } from "../mail/send";
import { RegistrationEmail } from "../mail/templates";
import { adminAction } from "../service/admin-action";
import { fail } from "../service/errors";
import { loadSettings } from "../settings";

export const saveEvent = adminAction(
  { schema: eventInput, tags: [TAGS.events] },
  async (input, { tx, audit, afterCommit }) => {
    const data = eventData(input);
    if (input.id) {
      const before = await tx.event.findUnique({ where: { id: input.id } });
      if (!before || before.deletedAt) fail("Événement introuvable.");
      const becomesPublished = input.status === "PUBLISHED" && before.status !== "PUBLISHED";
      const after = await tx.event.update({
        where: { id: input.id },
        data: {
          ...data,
          status: input.status,
          ...(becomesPublished ? { publishedAt: new Date() } : {}),
        },
      });
      await audit.updated("Event", before, after);
      if (becomesPublished) afterCommit(() => announceEventOnDiscord(after.id));
      return { id: after.id };
    }
    const slug = await uniqueEventSlug(tx, input.title, input.date);
    const created = await tx.event.create({
      data: {
        ...data,
        slug,
        status: input.status,
        publishedAt: input.status === "PUBLISHED" ? new Date() : null,
      },
    });
    await audit.created("Event", created);
    if (created.status === "PUBLISHED") afterCommit(() => announceEventOnDiscord(created.id));
    return { id: created.id };
  },
);

/** Copie en brouillon, une semaine plus tard, sans les inscrits. */
export const duplicateEvent = adminAction(
  { schema: idInput, tags: [TAGS.events] },
  async ({ id }, { tx, audit }) => {
    const source = await tx.event.findUnique({ where: { id } });
    if (!source) fail("Événement introuvable.");
    const startsAt = new Date(source.startsAt.getTime() + 7 * 86_400_000);
    const endsAt = source.endsAt ? new Date(source.endsAt.getTime() + 7 * 86_400_000) : null;
    const day = addDays(parisDay(source.startsAt), 7);
    const created = await tx.event.create({
      data: {
        title: source.title,
        slug: await uniqueEventSlug(tx, source.title, day),
        gameId: source.gameId,
        type: source.type,
        startsAt,
        endsAt,
        location: source.location,
        description: source.description,
        capacity: source.capacity,
        priceCents: source.priceCents,
        isHot: source.isHot,
        status: "DRAFT",
      },
    });
    await audit.created("Event", created);
    return { id: created.id };
  },
);

export const setEventStatus = adminAction(
  {
    schema: z.object({
      id: z.string(),
      status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]),
    }),
    tags: [TAGS.events],
  },
  async ({ id, status }, { tx, audit, afterCommit }) => {
    const before = await tx.event.findUnique({
      where: { id },
      include: {
        registrations: {
          where: { status: { in: ["REGISTERED", "WAITLISTED"] }, email: { not: null } },
        },
      },
    });
    if (!before || before.deletedAt) fail("Événement introuvable.");
    const after = await tx.event.update({
      where: { id },
      data: {
        status,
        ...(status === "PUBLISHED" && !before.publishedAt ? { publishedAt: new Date() } : {}),
      },
    });
    const { registrations: _r, ...beforeRow } = before;
    await audit.updated("Event", beforeRow, after);

    if (status === "PUBLISHED" && before.status !== "PUBLISHED") {
      afterCommit(() => announceEventOnDiscord(id));
    }
    if (
      status === "CANCELLED" &&
      before.status !== "CANCELLED" &&
      before.registrations.length > 0
    ) {
      const settings = await loadSettings(tx);
      const { when, where } = describeEvent(after, formatAddress(settings.address));
      for (const r of before.registrations) {
        const to = r.email;
        if (!to) continue;
        afterCommit(() =>
          sendMail(
            to,
            `Annulation : ${after.title}`,
            createElement(RegistrationEmail, {
              firstName: r.firstName,
              eventTitle: after.title,
              when,
              where,
              status: "CANCELLED_BY_EVENT",
            }),
          ),
        );
      }
    }
    return null;
  },
);

export const trashEvent = adminAction(
  { schema: idInput, tags: [TAGS.events] },
  async ({ id }, { tx, audit }) => {
    const before = await tx.event.findUnique({ where: { id } });
    if (!before) fail("Événement introuvable.");
    const after = await tx.event.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit.updated("Event", before, after);
    return null;
  },
);

export const restoreEvent = adminAction(
  { schema: idInput, tags: [TAGS.events] },
  async ({ id }, { tx, audit }) => {
    const before = await tx.event.findUnique({ where: { id } });
    if (!before) fail("Événement introuvable.");
    const after = await tx.event.update({ where: { id }, data: { deletedAt: null } });
    await audit.updated("Event", before, after);
    return null;
  },
);

// ── Inscrits ───────────────────────────────────────────────

export const addRegistration = adminAction(
  { schema: adminRegistrationInput, tags: [TAGS.events] },
  async (input, { tx, audit }) => {
    const { registration, status } = await createRegistration(tx, {
      eventId: input.eventId,
      firstName: input.firstName,
      lastName: input.lastName,
      playerId: input.playerId,
      email: null,
      isMinor: input.isMinor,
      memberId: input.memberId,
      source: "ADMIN",
    });
    await audit.created("EventRegistration", registration);
    return { status };
  },
);

export const setRegistrationStatus = adminAction(
  { schema: presenceInput, tags: [TAGS.events] },
  async ({ id, status }, { tx, audit }) => {
    const before = await tx.eventRegistration.findUnique({ where: { id } });
    if (!before) fail("Inscription introuvable.");
    const after = await tx.eventRegistration.update({
      where: { id },
      data: {
        status,
        checkedInAt:
          status === "PRESENT" ? new Date() : status === "ABSENT" ? null : before.checkedInAt,
        cancelledAt: status === "CANCELLED" ? new Date() : null,
      },
    });
    await audit.updated("EventRegistration", before, after);
    return null;
  },
);

/** Promotion depuis la liste d'attente (et e-mail si le participant a laissé une adresse). */
export const promoteRegistration = adminAction(
  { schema: idInput, tags: [TAGS.events] },
  async ({ id }, { tx, audit, afterCommit }) => {
    const before = await tx.eventRegistration.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!before || before.status !== "WAITLISTED")
      fail("Cette personne n'est pas en liste d'attente.");
    const taken = await countTaken(tx, before.eventId);
    if (before.event.capacity != null && taken >= before.event.capacity) {
      fail(
        "L'événement est complet : augmentez la capacité ou retirez un inscrit avant de promouvoir.",
      );
    }
    const { event, ...beforeRow } = before;
    const after = await tx.eventRegistration.update({
      where: { id },
      data: { status: "REGISTERED" },
    });
    await audit.updated("EventRegistration", beforeRow, after);
    const to = before.email;
    if (to) {
      const settings = await loadSettings(tx);
      const { when, where } = describeEvent(event, formatAddress(settings.address));
      afterCommit(() =>
        sendMail(
          to,
          `Une place pour vous : ${event.title}`,
          createElement(RegistrationEmail, {
            firstName: before.firstName,
            eventTitle: event.title,
            when,
            where,
            status: "PROMOTED",
            isMinor: before.isMinor,
          }),
        ),
      );
    }
    return null;
  },
);

export const linkRegistrationToMember = adminAction(
  { schema: linkMemberInput },
  async ({ registrationId, memberId }, { tx, audit }) => {
    const before = await tx.eventRegistration.findUnique({ where: { id: registrationId } });
    if (!before) fail("Inscription introuvable.");
    const after = await tx.eventRegistration.update({
      where: { id: registrationId },
      data: { memberId },
    });
    await audit.updated("EventRegistration", before, after);
    return null;
  },
);

export const deleteRegistration = adminAction(
  { schema: idInput, tags: [TAGS.events] },
  async ({ id }, { tx, audit }) => {
    const before = await tx.eventRegistration.findUnique({ where: { id } });
    if (!before) fail("Inscription introuvable.");
    await tx.eventRegistration.delete({ where: { id } });
    await audit.deleted("EventRegistration", before);
    return null;
  },
);
