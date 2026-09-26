import { describe, expect, it } from "vitest";
import { computeDiff, MASK } from "@/server/service/audit";

describe("diff du journal d'audit", () => {
  it("masque les valeurs personnelles mais garde la trace du changement", () => {
    const diff = computeDiff(
      "Member",
      { id: "1", firstName: "Camille", status: "ACTIVE", notes: null },
      { id: "1", firstName: "Camile", status: "EXPIRED", notes: "RAS" },
    );
    expect(diff.firstName).toEqual({ before: MASK, after: MASK });
    expect(diff.notes).toEqual({ before: null, after: MASK });
    expect(diff.status).toEqual({ before: "ACTIVE", after: "EXPIRED" });
    expect(JSON.stringify(diff)).not.toContain("Camille");
  });

  it("ignore les champs inchangés, les dates techniques et les relations", () => {
    const diff = computeDiff(
      "Event",
      { id: "e", title: "Draft", updatedAt: new Date(1), game: { name: "Magic" } },
      { id: "e", title: "Draft", updatedAt: new Date(2), game: { name: "Pokémon" } },
    );
    expect(diff).toEqual({});
  });

  it("sérialise les dates et tableaux de scalaires", () => {
    const diff = computeDiff("Game", { id: "g", formats: ["A"] }, { id: "g", formats: ["A", "B"] });
    expect(diff.formats).toEqual({ before: '["A"]', after: '["A","B"]' });
  });

  it("création : tout est « après »", () => {
    const diff = computeDiff("EventRegistration", null, {
      id: "r",
      email: "a@b.fr",
      status: "REGISTERED",
    });
    expect(diff.email).toEqual({ before: null, after: MASK });
    expect(diff.status).toEqual({ before: null, after: "REGISTERED" });
  });
});
