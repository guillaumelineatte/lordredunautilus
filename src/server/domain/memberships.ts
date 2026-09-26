import "server-only";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { dayToDbDate, dbDateToDay, membershipEnd, renewalStart } from "@/lib/dates";
import type { Tx } from "../db";
import type { AuditRecorder } from "../service/audit";
import { fail } from "../service/errors";
import { recomputeMemberStatus } from "./members";

export type RecordMembership = {
  memberId: string;
  planId: string;
  startDate: string;
  paymentMethod: PaymentMethod;
  amountCents: number | null;
  transactionRef: string | null;
  cardNumber: string | null;
  cardHandedOver: boolean;
  renewedFromId?: string | null;
};

export async function recordMembership(tx: Tx, input: RecordMembership, audit: AuditRecorder) {
  const plan = await tx.membershipPlan.findUnique({ where: { id: input.planId } });
  if (!plan || plan.kind !== "MEMBERSHIP" || !plan.durationDays) {
    fail("Cette formule ne peut pas être enregistrée comme adhésion.", {
      planId: "Formule invalide.",
    });
  }
  const member = await tx.member.findUnique({ where: { id: input.memberId } });
  if (!member || member.deletedAt || member.anonymizedAt) fail("Adhérent introuvable.");

  const endDate = membershipEnd(input.startDate, plan.durationDays);
  const membership = await tx.membership.create({
    data: {
      memberId: input.memberId,
      planId: plan.id,
      startDate: dayToDbDate(input.startDate),
      endDate: dayToDbDate(endDate),
      amountCents: input.amountCents ?? plan.priceCents,
      paymentMethod: input.paymentMethod,
      transactionRef: input.transactionRef,
      renewedFromId: input.renewedFromId ?? null,
      cardHandedOverAt: input.cardHandedOver ? new Date() : null,
    },
  });
  await audit.created("Membership", membership);

  if (input.cardNumber && input.cardNumber !== member.cardNumber) {
    const clash = await tx.member.findUnique({
      where: { cardNumber: input.cardNumber },
      select: { id: true },
    });
    if (clash && clash.id !== member.id)
      fail("Ce numéro de carte est déjà attribué.", { cardNumber: "Déjà attribué." });
    const updated = await tx.member.update({
      where: { id: member.id },
      data: { cardNumber: input.cardNumber },
    });
    await audit.updated("Member", member, updated);
  }

  await recomputeMemberStatus(tx, member.id, audit);
  return membership;
}

/** Renouvellement : nouvelle adhésion chaînée à la précédente. */
export async function renewMembership(
  tx: Tx,
  input: Omit<RecordMembership, "memberId" | "startDate" | "renewedFromId"> & {
    previousId: string;
  },
  audit: AuditRecorder,
) {
  const previous = await tx.membership.findUnique({
    where: { id: input.previousId },
    include: { renewedBy: { select: { id: true } } },
  });
  if (!previous) fail("Adhésion introuvable.");
  if (previous.renewedBy) fail("Cette adhésion a déjà été renouvelée.");
  const startDate = renewalStart(dbDateToDay(previous.endDate));
  return recordMembership(
    tx,
    { ...input, memberId: previous.memberId, startDate, renewedFromId: previous.id },
    audit,
  );
}
