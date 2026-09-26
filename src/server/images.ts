import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { putPublicFile } from "./storage";

export const VARIANTS = { thumb: 480, medium: 1000, large: 1920 } as const;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
];

export type ProcessedPhoto = {
  storageKey: string;
  thumbUrl: string;
  mediumUrl: string;
  largeUrl: string;
  width: number;
  height: number;
  blurDataUrl: string;
};

/**
 * Génère les trois variantes WebP d'une photo. `rotate()` applique l'orientation
 * EXIF, et sharp supprime toutes les métadonnées (dont la géolocalisation).
 */
export async function processPhoto(input: Buffer): Promise<ProcessedPhoto> {
  const base = sharp(input, { failOn: "error" }).rotate();
  const meta = await base.metadata();
  const orientedSwap = (meta.orientation ?? 1) >= 5;
  const width = (orientedSwap ? meta.height : meta.width) ?? 0;
  const height = (orientedSwap ? meta.width : meta.height) ?? 0;
  if (!width || !height) throw new Error("Image illisible");

  const storageKey = `photos/${new Date().getFullYear()}/${randomUUID()}`;
  const urls: Record<keyof typeof VARIANTS, string> = { thumb: "", medium: "", large: "" };

  for (const [name, size] of Object.entries(VARIANTS) as [keyof typeof VARIANTS, number][]) {
    const buffer = await sharp(input)
      .rotate()
      .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    urls[name] = await putPublicFile(`${storageKey}/${name}.webp`, buffer, "image/webp");
  }

  const blur = await sharp(input)
    .rotate()
    .resize(16, 16, { fit: "inside" })
    .webp({ quality: 40 })
    .toBuffer();

  return {
    storageKey,
    thumbUrl: urls.thumb,
    mediumUrl: urls.medium,
    largeUrl: urls.large,
    width,
    height,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
  };
}
