import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  isIsoDay,
  membershipEnd,
  parisDay,
  parisTime,
  parisToUtc,
  renewalStart,
  seasonLabel,
} from "@/lib/dates";

describe("jours calendaires", () => {
  it("valide les dates ISO", () => {
    expect(isIsoDay("2026-09-26")).toBe(true);
    expect(isIsoDay("2026-02-30")).toBe(false);
    expect(isIsoDay("26/09/2026")).toBe(false);
  });

  it("ajoute des jours en traversant les mois et années", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(daysBetween("2026-09-26", "2026-10-26")).toBe(30);
  });

  it("calcule le jour à Paris, pas en UTC", () => {
    // 23h30 UTC le 31 décembre = 0h30 à Paris le 1er janvier
    expect(parisDay(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });
});

describe("heures de Paris", () => {
  it("convertit l'heure d'été (UTC+2)", () => {
    expect(parisToUtc("2026-07-10", "19:30").toISOString()).toBe("2026-07-10T17:30:00.000Z");
  });
  it("convertit l'heure d'hiver (UTC+1)", () => {
    expect(parisToUtc("2026-12-10", "19:30").toISOString()).toBe("2026-12-10T18:30:00.000Z");
  });
  it("gère le jour du changement d'heure", () => {
    expect(parisToUtc("2026-10-25", "13:00").toISOString()).toBe("2026-10-25T12:00:00.000Z");
    expect(parisTime(parisToUtc("2026-03-29", "19:00"))).toBe("19:00");
  });
});

describe("adhésions", () => {
  it("fin inclusive : 365 jours à partir du 26/09/2026 → 25/09/2027", () => {
    expect(membershipEnd("2026-09-26", 365)).toBe("2027-09-25");
  });

  it("renouvellement avant l'échéance : démarre le lendemain de l'ancienne fin", () => {
    expect(renewalStart("2026-10-15", "2026-09-26")).toBe("2026-10-16");
  });

  it("renouvellement le jour même de la fin : pas de trou ni de chevauchement", () => {
    expect(renewalStart("2026-09-26", "2026-09-26")).toBe("2026-09-27");
  });

  it("renouvellement après échéance : démarre aujourd'hui", () => {
    expect(renewalStart("2026-08-01", "2026-09-26")).toBe("2026-09-26");
  });

  it("saison associative basculant au 1er septembre", () => {
    expect(seasonLabel("2026-09-01")).toBe("2026-2027");
    expect(seasonLabel("2027-08-31")).toBe("2026-2027");
  });
});
