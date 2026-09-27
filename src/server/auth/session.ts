import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

/** Session admin de la requête courante (dédupliquée par requête). */
export const getAdminSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** À appeler en tête de chaque page admin protégée. */
export async function requireAdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/timonerie/connexion");
  return session;
}
