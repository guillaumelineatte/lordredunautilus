import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

// mise en cache le temps de la requête
export const getAdminSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

// à appeler en haut de chaque page de la timonerie
export async function requireAdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/timonerie/connexion");
  return session;
}
