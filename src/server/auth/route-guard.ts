import "server-only";
import { auth } from "./auth";

/** Vérifie la session admin dans un Route Handler. */
export async function adminFromRequest(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export function unauthorized() {
  return Response.json({ error: "Session expirée. Reconnectez-vous." }, { status: 401 });
}

/** Nom de fichier sûr pour Content-Disposition. */
export function attachment(filename: string, inline = false): string {
  const ascii = filename
    .normalize("NFD")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/["\\]/g, "");
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
