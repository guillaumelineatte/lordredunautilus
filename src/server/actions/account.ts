"use server";

import { z } from "zod";
import { getAdminSession } from "../auth/session";
import { adminAction } from "../service/admin-action";
import { fail } from "../service/errors";

// on révoque par id pour ne jamais envoyer le jeton au navigateur
export const revokeSession = adminAction(
  { schema: z.object({ id: z.string() }) },
  async ({ id }, { tx, audit, adminId }) => {
    const current = await getAdminSession();
    if (current?.session.id === id)
      fail("Utilisez « Se déconnecter » pour fermer la session en cours.");
    const deleted = await tx.adminSession.deleteMany({ where: { id, userId: adminId } });
    if (deleted.count === 0) fail("Session introuvable.");
    await audit.log("UPDATE", "AdminUser", adminId, {
      operation: { before: null, after: "Session révoquée" },
    });
    return null;
  },
);

export const revokeOtherSessions = adminAction(
  { schema: z.object({}) },
  async (_input, { tx, audit, adminId }) => {
    const current = await getAdminSession();
    const deleted = await tx.adminSession.deleteMany({
      where: { userId: adminId, NOT: { id: current?.session.id ?? "" } },
    });
    await audit.log("UPDATE", "AdminUser", adminId, {
      operation: { before: null, after: `${deleted.count} autre(s) session(s) révoquée(s)` },
    });
    return { count: deleted.count };
  },
);
