import "server-only";
import { auth } from "./auth";

// pour les route handlers
export async function adminFromRequest(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ?? null;
}

export function unauthorized() {
  return Response.json({ error: "Session expirée. Reconnectez-vous." }, { status: 401 });
}

// nom de fichier propre pour Content-Disposition
export function attachment(filename: string, inline = false): string {
  const ascii = filename
    .normalize("NFD")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/["\\]/g, "");
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
