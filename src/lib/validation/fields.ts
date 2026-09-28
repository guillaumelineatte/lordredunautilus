import { z } from "zod";
import { isIsoDay } from "../dates";

// Petits schémas qui acceptent aussi bien un objet JS que les valeurs brutes
// d'un FormData (des chaînes, "on" pour une case cochée).

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const text = (max: number, required = "Ce champ est obligatoire.") =>
  z.string({ error: required }).trim().min(1, required).max(max, `${max} caractères maximum.`);

export const optionalText = (max: number) =>
  z
    .preprocess(
      emptyToNull,
      z.string().trim().max(max, `${max} caractères maximum.`).nullable().optional(),
    )
    .transform((v) => v ?? null);

export const checkbox = z.preprocess(
  (v) => v === true || v === "on" || v === "true" || v === "1",
  z.boolean(),
);

export const int = (min: number, max: number, msg = "Nombre invalide.") =>
  z.coerce.number({ error: msg }).int(msg).min(min, msg).max(max, msg);

export const optionalInt = (min: number, max: number, msg = "Nombre invalide.") =>
  z
    .preprocess(
      emptyToNull,
      z.coerce.number({ error: msg }).int(msg).min(min, msg).max(max, msg).nullable().optional(),
    )
    .transform((v) => v ?? null);

// "35" ou "3,50" (en euros) vers des centimes
export const euros = z.union([z.string(), z.number()]).transform((v, ctx) => {
  const n = typeof v === "number" ? v : Number(v.replace(",", ".").replace(/\s|€/g, ""));
  if (!Number.isFinite(n) || n < 0 || n > 100_000) {
    ctx.addIssue({ code: "custom", message: "Montant invalide." });
    return z.NEVER;
  }
  return Math.round(n * 100);
});

export const optionalEuros = z
  .preprocess(emptyToNull, euros.nullable().optional())
  .transform((v) => v ?? null);

export const day = z.string({ error: "Date invalide." }).refine(isIsoDay, "Date invalide.");

export const optionalDay = z
  .preprocess(emptyToNull, day.nullable().optional())
  .transform((v) => v ?? null);

export const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (HH:MM).");

export const optionalTime = z
  .preprocess(emptyToNull, time.nullable().optional())
  .transform((v) => v ?? null);

export const email = z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(254);

export const optionalEmail = z
  .preprocess(emptyToNull, email.nullable().optional())
  .transform((v) => v ?? null);

export const id = z.string().min(1).max(64);

export const optionalId = z
  .preprocess(emptyToNull, id.nullable().optional())
  .transform((v) => v ?? null);

// champ caché qui contient du JSON
export function json<T extends z.ZodType>(schema: T) {
  return z
    .union([z.string(), z.array(z.unknown()), z.record(z.string(), z.unknown())])
    .transform((v, ctx) => {
      if (typeof v !== "string") return v;
      try {
        return JSON.parse(v) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Données invalides." });
        return z.NEVER;
      }
    })
    .pipe(schema);
}

// textarea, une valeur par ligne (les lignes vides sautent)
export const lines = z
  .union([z.string(), z.array(z.string())])
  .transform((v) =>
    (Array.isArray(v) ? v : v.split("\n")).map((l) => l.trim()).filter((l) => l.length > 0),
  );

export function oneOf<const T extends readonly [string, ...string[]]>(
  values: T,
  msg = "Valeur invalide.",
) {
  return z.enum(values, { error: msg });
}
