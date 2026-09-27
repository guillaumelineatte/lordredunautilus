"use server";

import { z } from "zod";
import { TAGS } from "@/lib/cache-tags";
import { dayToDbDate, todayParis } from "@/lib/dates";
import {
  idInput,
  memberInput,
  membershipInput,
  membershipUpdateInput,
  mergeInput,
  renewInput,
} from "@/lib/validation/schemas";
import {
  assertCardNumberFree,
  deleteMember,
  enforcePhotoRules,
  membershipStatus,
  recomputeMemberStatus,
  syncGameIds,
} from "../domain/members";
import { recordMembership, renewMembership, updateMembership } from "../domain/memberships";
import { mergeMembers } from "../domain/merge";
import { adminAction } from "../service/admin-action";
import { fail } from "../service/errors";

const dayOrNull = (v: string | null) => (v ? dayToDbDate(v) : null);

/**
 * Création ou modification d'une fiche.
 * - statut : suspendu si coché, sinon déduit des adhésions (actif / échu) ;
 * - numéro de carte unique, identifiants de jeu validés par la regex du jeu ;
 * - autorisation photo retirée : photos où le membre est identifié dépubliées.
 */
export const saveMember = adminAction(
  { schema: memberInput, tags: [TAGS.stats, TAGS.photos] },
  async (input, { tx, audit }) => {
    const data = {
      firstName: input.firstName,
      lastName: input.lastName,
      cardNumber: input.cardNumber,
      notes: input.notes,
      imageRightsGallery: input.imageRightsGallery,
      imageRightsGallerySource: input.imageRightsGallery ? input.imageRightsGallerySource : null,
      imageRightsGalleryAt: input.imageRightsGallery
        ? (dayOrNull(input.imageRightsGalleryAt) ?? dayToDbDate(todayParis()))
        : null,
      imageRightsSocial: input.imageRightsSocial,
      imageRightsSocialSource: input.imageRightsSocial ? input.imageRightsSocialSource : null,
      imageRightsSocialAt: input.imageRightsSocial
        ? (dayOrNull(input.imageRightsSocialAt) ?? dayToDbDate(todayParis()))
        : null,
    };

    await assertCardNumberFree(tx, input.cardNumber, input.id ?? undefined);

    if (input.id) {
      const before = await tx.member.findUnique({ where: { id: input.id } });
      if (!before || before.anonymizedAt) fail("Fiche introuvable.");
      const status = input.suspended ? "SUSPENDED" : await membershipStatus(tx, before.id);
      const after = await tx.member.update({ where: { id: input.id }, data: { ...data, status } });
      await audit.updated("Member", before, after);
      await syncGameIds(tx, after.id, input.gameIds, audit);
      const unpublished = await enforcePhotoRules(tx, after.id, audit);
      return { id: after.id, unpublished };
    }

    const created = await tx.member.create({
      data: {
        ...data,
        // Pas encore d'adhésion : « échu » jusqu'à l'enregistrement de la première.
        status: input.suspended ? "SUSPENDED" : "EXPIRED",
      },
    });
    await audit.created("Member", created);
    await syncGameIds(tx, created.id, input.gameIds, audit);
    return { id: created.id, unpublished: 0 };
  },
);

/** Corbeille (soft delete) : la fiche sera anonymisée automatiquement après 30 jours. */
export const trashMember = adminAction(
  { schema: idInput, tags: [TAGS.stats] },
  async ({ id }, { tx, audit }) => {
    const before = await tx.member.findUnique({ where: { id } });
    if (!before) fail("Fiche introuvable.");
    const after = await tx.member.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit.updated("Member", before, after);
    return null;
  },
);

export const restoreMember = adminAction(
  { schema: idInput, tags: [TAGS.stats] },
  async ({ id }, { tx, audit }) => {
    const before = await tx.member.findUnique({ where: { id } });
    if (!before || before.anonymizedAt) fail("Cette fiche ne peut plus être restaurée.");
    const after = await tx.member.update({ where: { id }, data: { deletedAt: null } });
    await audit.updated("Member", before, after);
    return null;
  },
);

const DELETE_REASON = "Suppression demandée depuis l'administration";

/** Supprime une fiche (définitivement, ou par anonymisation si elle a des adhésions). */
export const deleteMemberAction = adminAction(
  { schema: idInput, tags: [TAGS.stats, TAGS.photos] },
  async ({ id }, { tx, audit }) => ({ mode: await deleteMember(tx, id, audit, DELETE_REASON) }),
);

/** Suppression groupée depuis la liste des adhérents. */
export const deleteMembersAction = adminAction(
  {
    schema: z.object({
      ids: z.array(z.string().min(1)).min(1, "Aucune fiche sélectionnée.").max(100),
    }),
    tags: [TAGS.stats, TAGS.photos],
  },
  async ({ ids }, { tx, audit }) => {
    let deleted = 0;
    let anonymized = 0;
    for (const id of ids) {
      const mode = await deleteMember(tx, id, audit, DELETE_REASON);
      if (mode === "deleted") deleted++;
      else anonymized++;
    }
    return { deleted, anonymized };
  },
);

export const mergeMembersAction = adminAction(
  { schema: mergeInput, tags: [TAGS.stats] },
  async ({ keepId, dropId }, { tx, audit }) => {
    await mergeMembers(tx, keepId, dropId, audit);
    return { id: keepId };
  },
);

export const recordMembershipAction = adminAction(
  { schema: membershipInput, tags: [TAGS.stats] },
  async (input, { tx, audit }) => {
    const m = await recordMembership(
      tx,
      {
        memberId: input.memberId,
        planId: input.planId,
        startDate: input.startDate,
        paymentMethod: input.paymentMethod,
        amountCents: input.amount,
        transactionRef: input.transactionRef,
        cardNumber: input.cardNumber,
        cardHandedOver: input.cardHandedOver,
      },
      audit,
    );
    return { id: m.id };
  },
);

export const renewMembershipAction = adminAction(
  { schema: renewInput, tags: [TAGS.stats] },
  async (input, { tx, audit }) => {
    const m = await renewMembership(
      tx,
      {
        previousId: input.previousId,
        planId: input.planId,
        paymentMethod: input.paymentMethod,
        amountCents: input.amount,
        transactionRef: input.transactionRef,
        cardNumber: input.cardNumber,
        cardHandedOver: input.cardHandedOver,
      },
      audit,
    );
    return { id: m.id };
  },
);

/** Correction d'une adhésion existante (formule, dates, montant, paiement, référence). */
export const updateMembershipAction = adminAction(
  { schema: membershipUpdateInput, tags: [TAGS.stats] },
  async (input, { tx, audit }) => {
    const m = await updateMembership(tx, input, audit);
    return { id: m.id };
  },
);

export const setCardHandedOver = adminAction(
  { schema: z.object({ id: z.string(), handed: z.boolean() }) },
  async ({ id, handed }, { tx, audit }) => {
    const before = await tx.membership.findUnique({ where: { id } });
    if (!before) fail("Adhésion introuvable.");
    const after = await tx.membership.update({
      where: { id },
      data: { cardHandedOverAt: handed ? new Date() : null },
    });
    await audit.updated("Membership", before, after);
    return null;
  },
);

export const deleteMembership = adminAction(
  { schema: idInput, tags: [TAGS.stats] },
  async ({ id }, { tx, audit }) => {
    const before = await tx.membership.findUnique({ where: { id } });
    if (!before) fail("Adhésion introuvable.");
    await tx.membership.updateMany({ where: { renewedFromId: id }, data: { renewedFromId: null } });
    await tx.membership.delete({ where: { id } });
    await audit.deleted("Membership", before);
    await recomputeMemberStatus(tx, before.memberId, audit);
    return null;
  },
);
