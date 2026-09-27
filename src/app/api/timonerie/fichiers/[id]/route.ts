import { adminFromRequest, attachment, unauthorized } from "@/server/auth/route-guard";
import { db } from "@/server/db";
import { metaFromHeaders } from "@/server/request";
import { writeAudit } from "@/server/service/audit";

export const dynamic = "force-dynamic";

// Téléchargement d'un scan privé (autorisation parentale) : admin uniquement, tracé.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminFromRequest(req);
  if (!admin) return unauthorized();
  const { id } = await params;
  const file = await db.privateFile.findUnique({
    where: { id },
    include: { member: { select: { id: true } } },
  });
  if (!file) return new Response("Introuvable", { status: 404 });

  await writeAudit(db, {
    action: "EXPORT",
    entity: "Member",
    entityId: file.member?.id ?? null,
    diff: { document: { before: null, after: "Scan d'autorisation parentale consulté" } },
    meta: metaFromHeaders(req.headers),
  });

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": attachment(file.filename, true),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
