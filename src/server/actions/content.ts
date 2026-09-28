"use server";

import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { TAGS } from "@/lib/cache-tags";
import { settingsSchemas, type SettingKey } from "@/lib/settings";
import { slugify } from "@/lib/text";
import {
  faqInput,
  gameInput,
  idInput,
  planInput,
  reorderInput,
  settingInput,
  testimonialInput,
} from "@/lib/validation/schemas";
import { adminAction } from "../service/admin-action";
import { fail } from "../service/errors";

// Témoignages

export const saveTestimonial = adminAction(
  { schema: testimonialInput, tags: [TAGS.testimonials] },
  async (input, { tx, audit }) => {
    const { id, ...data } = input;
    if (id) {
      const before = await tx.testimonial.findUnique({ where: { id } });
      if (!before) fail("Témoignage introuvable.");
      const after = await tx.testimonial.update({ where: { id }, data });
      await audit.updated("Testimonial", before, after);
      return { id };
    }
    const count = await tx.testimonial.count();
    const created = await tx.testimonial.create({ data: { ...data, sortOrder: count } });
    await audit.created("Testimonial", created);
    return { id: created.id };
  },
);

export const deleteTestimonial = adminAction(
  { schema: idInput, tags: [TAGS.testimonials] },
  async ({ id }, { tx, audit }) => {
    const before = await tx.testimonial.findUnique({ where: { id } });
    if (!before) fail("Témoignage introuvable.");
    await tx.testimonial.delete({ where: { id } });
    await audit.deleted("Testimonial", before);
    return null;
  },
);

export const reorderTestimonials = adminAction(
  { schema: reorderInput, tags: [TAGS.testimonials] },
  async ({ ids }, { tx, audit }) => {
    for (const [i, id] of ids.entries())
      await tx.testimonial.update({ where: { id }, data: { sortOrder: i } });
    await audit.log("UPDATE", "Testimonial", null, {
      ordre: { before: null, after: ids.join(",") },
    });
    return null;
  },
);

// FAQ

export const saveFaq = adminAction(
  { schema: faqInput, tags: [TAGS.faq] },
  async (input, { tx, audit }) => {
    const { id, ...data } = input;
    if (id) {
      const before = await tx.faqItem.findUnique({ where: { id } });
      if (!before) fail("Question introuvable.");
      const after = await tx.faqItem.update({ where: { id }, data });
      await audit.updated("FaqItem", before, after);
      return { id };
    }
    const count = await tx.faqItem.count();
    const created = await tx.faqItem.create({ data: { ...data, sortOrder: count } });
    await audit.created("FaqItem", created);
    return { id: created.id };
  },
);

export const deleteFaq = adminAction(
  { schema: idInput, tags: [TAGS.faq] },
  async ({ id }, { tx, audit }) => {
    const before = await tx.faqItem.findUnique({ where: { id } });
    if (!before) fail("Question introuvable.");
    await tx.faqItem.delete({ where: { id } });
    await audit.deleted("FaqItem", before);
    return null;
  },
);

export const reorderFaq = adminAction(
  { schema: reorderInput, tags: [TAGS.faq] },
  async ({ ids }, { tx, audit }) => {
    for (const [i, id] of ids.entries())
      await tx.faqItem.update({ where: { id }, data: { sortOrder: i } });
    await audit.log("UPDATE", "FaqItem", null, { ordre: { before: null, after: ids.join(",") } });
    return null;
  },
);

// Formules

export const savePlan = adminAction(
  { schema: planInput, tags: [TAGS.plans] },
  async (input, { tx, audit }) => {
    const data = {
      name: input.name,
      kind: input.kind,
      priceCents: input.price,
      reducedPriceCents: input.reducedPrice,
      periodLabel: input.periodLabel,
      durationDays: input.kind === "DISCOVERY" ? null : input.durationDays,
      benefits: input.benefits,
      isFeatured: input.isFeatured,
      isActive: input.isActive,
    };
    if (input.isFeatured) {
      await tx.membershipPlan.updateMany({
        where: { isFeatured: true, NOT: { id: input.id ?? "" } },
        data: { isFeatured: false },
      });
    }
    if (input.id) {
      const before = await tx.membershipPlan.findUnique({ where: { id: input.id } });
      if (!before) fail("Formule introuvable.");
      const after = await tx.membershipPlan.update({ where: { id: input.id }, data });
      await audit.updated("MembershipPlan", before, after);
      return { id: after.id };
    }
    const count = await tx.membershipPlan.count();
    const created = await tx.membershipPlan.create({
      data: { ...data, slug: slugify(input.name), sortOrder: count },
    });
    await audit.created("MembershipPlan", created);
    return { id: created.id };
  },
);

export const deletePlan = adminAction(
  { schema: idInput, tags: [TAGS.plans] },
  async ({ id }, { tx, audit }) => {
    const before = await tx.membershipPlan.findUnique({
      where: { id },
      include: { _count: { select: { memberships: true } } },
    });
    if (!before) fail("Formule introuvable.");
    if (before._count.memberships > 0) {
      fail("Des adhésions utilisent cette formule : désactivez-la plutôt que de la supprimer.");
    }
    await tx.membershipPlan.delete({ where: { id } });
    const { _count, ...row } = before;
    await audit.deleted("MembershipPlan", row);
    return null;
  },
);

export const reorderPlans = adminAction(
  { schema: reorderInput, tags: [TAGS.plans] },
  async ({ ids }, { tx, audit }) => {
    for (const [i, id] of ids.entries())
      await tx.membershipPlan.update({ where: { id }, data: { sortOrder: i } });
    await audit.log("UPDATE", "MembershipPlan", null, {
      ordre: { before: null, after: ids.join(",") },
    });
    return null;
  },
);

// Jeux

export const saveGame = adminAction(
  { schema: gameInput, tags: [TAGS.games, TAGS.events] },
  async (input, { tx, audit }) => {
    const { id, ...data } = input;
    if (id) {
      const before = await tx.game.findUnique({ where: { id } });
      if (!before) fail("Jeu introuvable.");
      const after = await tx.game.update({ where: { id }, data });
      await audit.updated("Game", before, after);
      return { id };
    }
    const count = await tx.game.count();
    const created = await tx.game.create({
      data: { ...data, slug: slugify(input.name), sortOrder: count },
    });
    await audit.created("Game", created);
    return { id: created.id };
  },
);

export const reorderGames = adminAction(
  { schema: reorderInput, tags: [TAGS.games] },
  async ({ ids }, { tx, audit }) => {
    for (const [i, id] of ids.entries())
      await tx.game.update({ where: { id }, data: { sortOrder: i } });
    await audit.log("UPDATE", "Game", null, { ordre: { before: null, after: ids.join(",") } });
    return null;
  },
);

// Réglages

export const saveSetting = adminAction(
  { schema: settingInput, tags: [TAGS.settings, TAGS.stats] },
  async ({ key, value }, { tx, audit }) => {
    const k = key as SettingKey;
    const parsed = (settingsSchemas[k] as z.ZodType).safeParse(value);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      fail(first ? first.message : "Valeur invalide.");
    }
    const json = parsed.data as Prisma.InputJsonValue;
    const before = await tx.siteSetting.findUnique({ where: { key: k } });
    const after = await tx.siteSetting.upsert({
      where: { key: k },
      create: { key: k, value: json },
      update: { value: json },
    });
    await audit.log(before ? "UPDATE" : "CREATE", "SiteSetting", k, {
      [k]: {
        before: before ? JSON.stringify(before.value) : null,
        after: JSON.stringify(after.value),
      },
    });
    return null;
  },
);
