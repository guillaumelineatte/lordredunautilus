import { z } from "zod";

// Réglages du site, une ligne par clé dans SiteSetting.
// Chaque clé a un schéma et une valeur par défaut : si la valeur en base manque
// ou est invalide on prend le défaut, comme ça le site ne casse pas.

const url = z.union([z.literal(""), z.string().trim().url("Adresse web invalide.")]);

export const settingsSchemas = {
  address: z.object({
    venue: z.string().trim().max(120),
    street: z.string().trim().max(160),
    postalCode: z.string().trim().max(10),
    city: z.string().trim().max(80),
    mapUrl: url,
  }),
  hours: z
    .array(z.object({ label: z.string().trim().min(1).max(60), value: z.string().trim().max(80) }))
    .max(10),
  contactEmail: z.string().trim().email("Adresse e-mail invalide."),
  paypal: z.object({
    address: z.string().trim().min(1, "Indiquez l'adresse PayPal.").max(200),
    link: url,
  }),
  stats: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(60),
        value: z.number().int().min(0).max(100_000),
        auto: z.enum(["none", "activeMembers", "foundedYear"]).default("none"),
      }),
    )
    .length(4),
  socials: z.object({ discord: url, instagram: url, facebook: url }),
  foundedYear: z.number().int().min(1900).max(2100),
  legal: z.object({
    associationName: z.string().trim().min(1).max(120),
    rna: z.string().trim().max(40),
    siege: z.string().trim().max(200),
    president: z.string().trim().max(120),
    publicationDirector: z.string().trim().max(120),
    hostName: z.string().trim().max(120),
    hostAddress: z.string().trim().max(200),
  }),
  privacyExtra: z.string().max(8000),
  membershipNote: z.string().max(400),
  features: z.object({ discordWebhook: z.boolean() }),
} as const;

export type SettingKey = keyof typeof settingsSchemas;
export type Settings = { [K in SettingKey]: z.infer<(typeof settingsSchemas)[K]> };

export const defaultSettings: Settings = {
  address: {
    venue: "[Nom du lieu]",
    street: "[Rue]",
    postalCode: "80000",
    city: "Amiens",
    mapUrl: "",
  },
  hours: [
    { label: "Mardi", value: "18h30 – 23h" },
    { label: "Vendredi", value: "19h – 00h" },
    { label: "Un samedi par mois", value: "dès 13h" },
  ],
  contactEmail: "contact@ordredunautilus.fr",
  paypal: { address: "tresorerie@ordredunautilus.fr", link: "" },
  stats: [
    { label: "membres actifs", value: 80, auto: "activeMembers" },
    { label: "soirées par semaine", value: 3, auto: "none" },
    { label: "tournois par an", value: 12, auto: "none" },
    { label: "année de fondation", value: 2021, auto: "foundedYear" },
  ],
  socials: { discord: "", instagram: "", facebook: "" },
  foundedYear: 2021,
  legal: {
    associationName: "L'Ordre du Nautilus",
    rna: "[RNA W…]",
    siege: "[adresse], 80000 Amiens",
    president: "[Prénom Nom]",
    publicationDirector: "[Prénom Nom]",
    hostName: "Vercel Inc.",
    hostAddress: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
  },
  privacyExtra: "",
  membershipNote:
    "Tarif réduit pour les étudiants et les moins de 18 ans sur présentation d'un justificatif.",
  features: { discordWebhook: false },
};

export const settingKeys = Object.keys(settingsSchemas) as SettingKey[];

export function parseSetting<K extends SettingKey>(key: K, value: unknown): Settings[K] {
  const parsed = settingsSchemas[key].safeParse(value);
  return parsed.success ? (parsed.data as Settings[K]) : defaultSettings[key];
}

export function formatAddress(a: Settings["address"]): string {
  return [a.venue, a.street, `${a.postalCode} ${a.city}`.trim()].filter(Boolean).join(", ");
}
