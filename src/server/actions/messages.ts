"use server";

import { z } from "zod";
import { idInput } from "@/lib/validation/schemas";
import { adminAction } from "../service/admin-action";
import { fail } from "../service/errors";

export const setMessageHandled = adminAction(
  { schema: z.object({ id: z.string(), handled: z.boolean() }) },
  async ({ id, handled }, { tx, audit }) => {
    const before = await tx.contactMessage.findUnique({ where: { id } });
    if (!before) fail("Message introuvable.");
    const after = await tx.contactMessage.update({
      where: { id },
      data: { status: handled ? "HANDLED" : "NEW", handledAt: handled ? new Date() : null },
    });
    await audit.updated("ContactMessage", before, after);
    return null;
  },
);

export const deleteMessage = adminAction({ schema: idInput }, async ({ id }, { tx, audit }) => {
  const before = await tx.contactMessage.findUnique({ where: { id } });
  if (!before) fail("Message introuvable.");
  await tx.contactMessage.delete({ where: { id } });
  await audit.deleted("ContactMessage", before);
  return null;
});
