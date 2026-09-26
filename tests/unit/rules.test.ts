import { describe, expect, it } from "vitest";
import { lockMinutes, lockUntil } from "@/server/auth/lockout";
import { alertTier } from "@/lib/membership-alerts";
import { publicationBlockers, type TaggedMember } from "@/lib/photo-rules";
import { dedupeKey, matchesPattern, publicName, slugify } from "@/lib/text";

const none = { d30: false, d7: false, d0: false };

describe("alertes d'échéance (J-30 / J-7 / J0)", () => {
  it("rien au-delà de 30 jours", () => expect(alertTier(31, none)).toBeNull());
  it("J-30", () => expect(alertTier(30, none)).toBe(30));
  it("une seule fois par palier", () => expect(alertTier(20, { ...none, d30: true })).toBeNull());
  it("J-7 après J-30", () => expect(alertTier(7, { ...none, d30: true })).toBe(7));
  it("rattrape un palier manqué (adhésion saisie tard)", () => expect(alertTier(5, none)).toBe(7));
  it("J0 le jour de la fin", () =>
    expect(alertTier(0, { d30: true, d7: true, d0: false })).toBe(0));
  it("plus rien une fois échue", () => expect(alertTier(-1, none)).toBeNull());
});

describe("verrouillage après 5 échecs", () => {
  it("pas de verrou avant 5 échecs", () => {
    expect(lockMinutes(4)).toBeNull();
    expect(lockUntil(4)).toBeNull();
  });
  it("15 minutes à partir de 5 échecs", () => {
    const now = new Date("2026-09-26T10:00:00Z");
    expect(lockMinutes(5)).toBe(15);
    expect(lockUntil(5, now)?.toISOString()).toBe("2026-09-26T10:15:00.000Z");
  });
  it("1 heure à partir de 10 échecs", () => expect(lockMinutes(10)).toBe(60));
});

const member = (over: Partial<TaggedMember> = {}): TaggedMember => ({
  firstName: "Inès",
  lastName: "Martin",
  isMinor: false,
  imageRightsGallery: true,
  imageRightsGallerySource: "VERBAL",
  anonymizedAt: null,
  ...over,
});

describe("règles de publication des photos", () => {
  it("bloquée tant que les droits ne sont pas vérifiés", () => {
    expect(
      publicationBlockers({ alt: "Une table", imageRightsChecked: false, taggedMembers: [] }),
    ).toHaveLength(1);
  });
  it("texte alternatif obligatoire", () => {
    expect(
      publicationBlockers({ alt: " ", imageRightsChecked: true, taggedMembers: [] })[0],
    ).toMatch(/texte alternatif/);
  });
  it("publiable sans personne identifiée", () => {
    expect(
      publicationBlockers({ alt: "Une table", imageRightsChecked: true, taggedMembers: [] }),
    ).toEqual([]);
  });
  it("membre identifié sans autorisation galerie", () => {
    const r = publicationBlockers({
      alt: "x",
      imageRightsChecked: true,
      taggedMembers: [member({ imageRightsGallery: false })],
    });
    expect(r[0]).toMatch(/n'a pas autorisé/);
  });
  it("mineur : l'autorisation orale ne suffit pas", () => {
    const r = publicationBlockers({
      alt: "x",
      imageRightsChecked: true,
      taggedMembers: [member({ isMinor: true })],
    });
    expect(r[0]).toMatch(/papier signé/);
  });
  it("mineur avec papier signé : publiable", () => {
    const r = publicationBlockers({
      alt: "x",
      imageRightsChecked: true,
      taggedMembers: [member({ isMinor: true, imageRightsGallerySource: "SIGNED_PAPER" })],
    });
    expect(r).toEqual([]);
  });
});

describe("textes", () => {
  it("anti-doublon insensible aux accents, à la casse et aux espaces", () => {
    expect(dedupeKey(" Hélène ", "LEFÈVRE")).toBe(dedupeKey("helene", "Lefevre"));
  });
  it("nom public : prénom + initiale", () =>
    expect(publicName({ firstName: "Camille", lastName: "durand" })).toBe("Camille D."));
  it("slug", () =>
    expect(slugify("Tournoi mensuel One Piece 2026-10-17")).toBe(
      "tournoi-mensuel-one-piece-2026-10-17",
    ));
  it("identifiants de jeu validés par la regex du jeu", () => {
    expect(matchesPattern("0123456789", "\\d{10}")).toBe(true);
    expect(matchesPattern("012345678", "\\d{10}")).toBe(false);
    // La regex s'applique à toute la valeur
    expect(matchesPattern("x0123456789", "\\d{10}")).toBe(false);
    // Le pseudo Wizards refuse les e-mails
    expect(matchesPattern("nemo@example.com", "[^\\s@]{2,32}(#\\d{4,6})?")).toBe(false);
    expect(matchesPattern("Nemo#12345", "[^\\s@]{2,32}(#\\d{4,6})?")).toBe(true);
  });
  it("regex invalide en base : ne bloque pas la saisie", () =>
    expect(matchesPattern("abc", "([")).toBe(true));
});
