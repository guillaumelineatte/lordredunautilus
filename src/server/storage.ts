import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import { env } from "./env";

// Photos de la galerie. En prod sur Vercel Blob (BLOB_READ_WRITE_TOKEN),
// en local dans storage/uploads, servi par /uploads/[...path].

const LOCAL_ROOT = path.join(process.cwd(), "storage", "uploads");

function safeLocalPath(key: string): string {
  const resolved = path.resolve(LOCAL_ROOT, key);
  if (!resolved.startsWith(LOCAL_ROOT + path.sep)) throw new Error("Chemin de fichier invalide");
  return resolved;
}

export async function putPublicFile(
  key: string,
  data: Buffer,
  contentType: string,
): Promise<string> {
  if (env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(key, data, {
      access: "public",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      token: env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }
  const file = safeLocalPath(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
  return `/uploads/${key}`;
}

export async function deletePublicFiles(urls: string[]): Promise<void> {
  const blobUrls = urls.filter((u) => u.startsWith("http"));
  const localUrls = urls.filter((u) => u.startsWith("/uploads/"));
  if (blobUrls.length > 0 && env.BLOB_READ_WRITE_TOKEN) {
    await del(blobUrls, { token: env.BLOB_READ_WRITE_TOKEN });
  }
  for (const u of localUrls) {
    await rm(safeLocalPath(u.replace(/^\/uploads\//, "")), { force: true });
  }
}

export async function readLocalUpload(key: string): Promise<Buffer | null> {
  try {
    return await readFile(safeLocalPath(key));
  } catch {
    return null;
  }
}
