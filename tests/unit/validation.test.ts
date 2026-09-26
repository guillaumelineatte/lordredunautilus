import { describe, expect, it } from "vitest";
import {
  contactInput,
  eventInput,
  memberInput,
  publicRegistrationInput,
} from "@/lib/validation/schemas";
import { parseSetting, defaultSettings } from "@/lib/settings";

describe("validation des formulaires", () => {
  it("fiche adhérent depuis un FormData : cases, nombres et JSON", () => {
    const r = memberInput.safeParse({
      firstName: " Inès ",
      lastName: "Martin",
      birthYear: "2012",
      isMinor: "on",
      imageRightsGallery: "on",
      imageRightsGallerySource: "SIGNED_PAPER",
      gameIds: JSON.stringify([{ gameId: "g1", value: "Ines-L" }]),
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.firstName).toBe("Inès");
      expect(r.data.birthYear).toBe(2012);
      expect(r.data.isMinor).toBe(true);
      expect(r.data.imageRightsSocial).toBe(false);
      expect(r.data.gameIds).toHaveLength(1);
    }
  });

  it("autorisation photo sans source : refusée", () => {
    const r = memberInput.safeParse({ firstName: "A", lastName: "B", imageRightsGallery: "on" });
    expect(r.success).toBe(false);
  });

  it("un seul identifiant par jeu", () => {
    const r = memberInput.safeParse({
      firstName: "A",
      lastName: "B",
      gameIds: [
        { gameId: "g1", value: "1" },
        { gameId: "g1", value: "2" },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("montant saisi en euros avec virgule → centimes", () => {
    const r = eventInput.safeParse({
      title: "Draft",
      type: "DRAFT",
      date: "2026-10-02",
      startTime: "19:30",
      price: "15,50",
    });
    expect(r.success && r.data.price).toBe(1550);
  });

  it("champ anti-robot rempli : refusé", () => {
    const r = contactInput.safeParse({
      firstName: "Jo",
      email: "jo@example.com",
      message: "Bonjour à tous",
      website: "http://spam",
    });
    expect(r.success).toBe(false);
  });

  it("inscription : e-mail facultatif, vide accepté", () => {
    const r = publicRegistrationInput.safeParse({
      eventId: "e1",
      firstName: "Jo",
      lastName: "Doe",
      email: "",
    });
    expect(r.success && r.data.email).toBe(null);
  });

  it("réglage invalide en base : retombe sur la valeur par défaut", () => {
    expect(parseSetting("contactEmail", "pas-un-email")).toBe(defaultSettings.contactEmail);
    expect(parseSetting("foundedYear", 2019)).toBe(2019);
  });
});
