import { adminFromRequest, unauthorized } from "@/server/auth/route-guard";
import { db } from "@/server/db";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, processPhoto } from "@/server/images";
import { metaFromHeaders } from "@/server/request";
import { AuditRecorder } from "@/server/service/audit";

export const runtime = "nodejs";
export const maxDuration = 60;

// Upload d'une photo. Le navigateur la réduit avant l'envoi pour passer sous la
// limite de 4,5 Mo de Vercel, on fait les variantes avec sharp et elle arrive en brouillon.
export async function POST(req: Request) {
  const admin = await adminFromRequest(req);
  if (!admin) return unauthorized();

  const form = await req.formData();
  const file = form.get("file");
  const eventId = form.get("eventId");
  if (!(file instanceof File))
    return Response.json({ error: "Aucun fichier reçu." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES)
    return Response.json({ error: "Fichier trop volumineux (15 Mo max)." }, { status: 413 });
  if (file.type && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return Response.json(
      { error: "Format non pris en charge (JPEG, PNG, WebP, AVIF, HEIC)." },
      { status: 415 },
    );
  }

  try {
    const processed = await processPhoto(Buffer.from(await file.arrayBuffer()));
    const count = await db.photo.count();
    const photo = await db.photo.create({
      data: {
        ...processed,
        alt: "",
        caption: null,
        eventId: typeof eventId === "string" && eventId ? eventId : null,
        sortOrder: count,
        isPublished: false,
      },
    });
    await new AuditRecorder(db, metaFromHeaders(req.headers)).created("Photo", photo);
    return Response.json({ id: photo.id, thumbUrl: photo.thumbUrl });
  } catch (error) {
    console.error("[upload]", error);
    return Response.json({ error: "Image illisible ou corrompue." }, { status: 422 });
  }
}
