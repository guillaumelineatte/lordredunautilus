import { z } from "zod";
import { settingKeys } from "../settings";
import { isValidRegex } from "../text";
import {
  checkbox,
  day,
  email,
  euros,
  id,
  json,
  lines,
  oneOf,
  optionalDay,
  optionalEmail,
  optionalEuros,
  optionalId,
  optionalInt,
  optionalText,
  optionalTime,
  text,
  time,
} from "./fields";

export const MEMBER_STATUSES = ["ACTIVE", "EXPIRED", "SUSPENDED"] as const;
export const CONSENT_SOURCES = ["SIGNED_PAPER", "VERBAL", "FORM"] as const;
export const PAYMENT_METHODS = ["PAYPAL", "CASH", "BANK_TRANSFER"] as const;
export const EVENT_TYPES = ["DISCOVERY", "OPEN_PLAY", "DRAFT", "TOURNAMENT"] as const;
export const EVENT_STATUSES = ["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"] as const;
export const PLAN_KINDS = ["DISCOVERY", "MEMBERSHIP"] as const;

const optionalConsent = z
  .preprocess((v) => (v === "" ? null : v), z.enum(CONSENT_SOURCES).nullable().optional())
  .transform((v) => v ?? null);

// Adhérents

export const gameIdEntry = z.object({
  gameId: id,
  value: z.string().trim().min(1, "Identifiant vide.").max(100),
});

export const memberInput = z
  .object({
    id: optionalId,
    firstName: text(80, "Indiquez le prénom."),
    lastName: text(80, "Indiquez le nom."),
    cardNumber: optionalText(40),
    suspended: checkbox,
    notes: optionalText(500),
    imageRightsGallery: checkbox,
    imageRightsGallerySource: optionalConsent,
    imageRightsGalleryAt: optionalDay,
    imageRightsSocial: checkbox,
    imageRightsSocialSource: optionalConsent,
    imageRightsSocialAt: optionalDay,
    gameIds: json(z.array(gameIdEntry)).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.imageRightsGallery && !v.imageRightsGallerySource) {
      ctx.addIssue({
        code: "custom",
        path: ["imageRightsGallerySource"],
        message: "Précisez la source de l'autorisation.",
      });
    }
    if (v.imageRightsSocial && !v.imageRightsSocialSource) {
      ctx.addIssue({
        code: "custom",
        path: ["imageRightsSocialSource"],
        message: "Précisez la source de l'autorisation.",
      });
    }
    const seen = new Set<string>();
    for (const g of v.gameIds) {
      if (seen.has(g.gameId)) {
        ctx.addIssue({
          code: "custom",
          path: ["gameIds"],
          message: "Un seul identifiant par jeu.",
        });
      }
      seen.add(g.gameId);
    }
  });
export type MemberInput = z.output<typeof memberInput>;

export const membershipInput = z.object({
  memberId: id,
  planId: id,
  startDate: day,
  paymentMethod: oneOf(PAYMENT_METHODS, "Choisissez le mode de paiement."),
  amount: optionalEuros,
  transactionRef: optionalText(64),
  cardNumber: optionalText(40),
  cardHandedOver: checkbox,
});
export type MembershipInput = z.output<typeof membershipInput>;

export const membershipUpdateInput = z
  .object({
    id,
    planId: id,
    startDate: day,
    endDate: day,
    amount: euros,
    paymentMethod: oneOf(PAYMENT_METHODS, "Choisissez le mode de paiement."),
    transactionRef: optionalText(64),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "La fin doit être postérieure ou égale au début.",
    path: ["endDate"],
  });
export type MembershipUpdateInput = z.output<typeof membershipUpdateInput>;

export const renewInput = membershipInput.omit({ memberId: true, startDate: true }).extend({
  previousId: id,
});

export const mergeInput = z
  .object({ keepId: id, dropId: id })
  .refine((v) => v.keepId !== v.dropId, {
    message: "Choisissez deux fiches différentes.",
    path: ["dropId"],
  });

// Événements

export const eventInput = z
  .object({
    id: optionalId,
    title: text(120, "Indiquez un titre."),
    gameId: optionalId,
    type: oneOf(EVENT_TYPES),
    date: day,
    startTime: time,
    endTime: optionalTime,
    location: optionalText(200),
    description: optionalText(5000),
    capacity: optionalInt(1, 1000, "Capacité invalide."),
    price: optionalEuros,
    isHot: checkbox,
    status: oneOf(EVENT_STATUSES).default("DRAFT"),
  })
  .refine((v) => !v.endTime || v.endTime > v.startTime || v.endTime < "06:00", {
    message: "L'heure de fin doit suivre l'heure de début.",
    path: ["endTime"],
  });
export type EventInput = z.output<typeof eventInput>;

export const honeypot = z
  .preprocess((v) => (v == null ? "" : v), z.string())
  .refine((v) => v === "", "Formulaire invalide.");

export const publicRegistrationInput = z.object({
  eventId: id,
  firstName: text(80, "Indiquez votre prénom."),
  lastName: text(80, "Indiquez votre nom."),
  playerId: optionalText(100),
  email: optionalEmail,
  website: honeypot,
});

export const adminRegistrationInput = z.object({
  eventId: id,
  firstName: text(80, "Indiquez le prénom."),
  lastName: text(80, "Indiquez le nom."),
  playerId: optionalText(100),
  memberId: optionalId,
});

// Contact

export const contactInput = z.object({
  firstName: z.string().trim().min(2, "Indiquez votre prénom.").max(80),
  email: email,
  game: optionalText(80),
  message: z.string().trim().min(6, "Dites-nous en un peu plus.").max(5000, "Message trop long."),
  website: honeypot,
});

// Contenus

export const testimonialInput = z.object({
  id: optionalId,
  quote: text(600, "Indiquez le texte."),
  displayName: text(40, "Indiquez le prénom affiché."),
  context: text(80, "Indiquez l'ancienneté ou le jeu."),
  isPublished: checkbox,
});

export const faqInput = z.object({
  id: optionalId,
  question: text(200, "Indiquez la question."),
  answer: text(4000, "Indiquez la réponse."),
  isPublished: checkbox,
});

export const planInput = z
  .object({
    id: optionalId,
    name: text(60, "Indiquez le nom."),
    kind: oneOf(PLAN_KINDS),
    price: euros,
    reducedPrice: optionalEuros,
    periodLabel: text(40, "Indiquez la période (« par an »)."),
    durationDays: optionalInt(1, 3660, "Durée invalide."),
    benefits: lines,
    isFeatured: checkbox,
    isActive: checkbox,
  })
  .refine((v) => v.kind === "DISCOVERY" || v.durationDays != null, {
    message: "Une formule d'adhésion doit avoir une durée.",
    path: ["durationDays"],
  });

export const gameInput = z.object({
  id: optionalId,
  name: text(80, "Indiquez le nom du jeu."),
  publisher: text(80, "Indiquez l'éditeur."),
  sigil: text(2, "Une ou deux lettres."),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur au format #RRGGBB."),
  usualDay: text(60, "Indiquez le jour habituel."),
  levels: text(80, "Indiquez les niveaux."),
  formats: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")).map((f) => f.trim()).filter(Boolean)),
  playerIdLabel: text(60, "Indiquez le libellé de l'identifiant."),
  playerIdPattern: optionalText(200).refine(
    (v) => v === null || isValidRegex(v),
    "Expression régulière invalide.",
  ),
  playerIdExample: optionalText(60),
  isActive: checkbox,
});

export const reorderInput = z.object({ ids: z.array(id).min(1).max(500) });

export const settingInput = z.object({
  key: z.enum(settingKeys as [string, ...string[]]),
  value: z.unknown(),
});

export const idInput = z.object({ id });

export const photoMetaInput = z.object({
  id,
  alt: z.string().trim().max(250),
  caption: optionalText(250),
  eventId: optionalId,
});

export const photoPublishInput = z.object({ id, publish: z.boolean() });

export const presenceInput = z.object({
  id,
  status: z.enum(["REGISTERED", "PRESENT", "ABSENT", "CANCELLED"]),
});

export const linkMemberInput = z.object({ registrationId: id, memberId: optionalId });

export const importInput = z.object({
  csv: z.string().min(1, "Fichier vide.").max(2_000_000, "Fichier trop volumineux."),
  mapping: z.record(z.string(), z.string()),
});

export const passwordInput = z.object({
  currentPassword: z.string().min(1, "Indiquez votre mot de passe actuel."),
  newPassword: z.string().min(12, "12 caractères minimum.").max(128),
});
