import { readLocalUpload } from "@/server/storage";

// Sert les photos déposées en local quand Vercel Blob n'est pas configuré.
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = path.join("/");
  const data = await readLocalUpload(key);
  if (!data) return new Response("Introuvable", { status: 404 });
  const type = key.endsWith(".webp")
    ? "image/webp"
    : key.endsWith(".png")
      ? "image/png"
      : "image/jpeg";
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
