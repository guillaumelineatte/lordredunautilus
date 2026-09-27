"use server";

import Papa from "papaparse";
import { TAGS } from "@/lib/cache-tags";
import { IMPORTABLE_FIELDS } from "@/lib/import-fields";
import { capitalize, matchesPattern } from "@/lib/text";
import { importInput } from "@/lib/validation/schemas";
import { adminAction } from "../service/admin-action";
import { fail } from "../service/errors";

export const importMembers = adminAction(
  { schema: importInput, tags: [TAGS.stats] },
  async ({ csv, mapping }, { tx, audit }) => {
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
    if (parsed.errors.length > 0 && parsed.data.length === 0) fail("Fichier CSV illisible.");

    const games = await tx.game.findMany({
      select: { id: true, slug: true, playerIdPattern: true },
    });
    const gameBySlug = new Map(games.map((g) => [g.slug, g]));
    const allowed = new Set<string>([...IMPORTABLE_FIELDS, ...games.map((g) => `game:${g.slug}`)]);
    for (const target of Object.values(mapping)) {
      if (target && !allowed.has(target)) fail(`Champ non autorisé : ${target}.`);
    }

    let created = 0;
    const skipped: string[] = [];
    for (const [index, row] of parsed.data.entries()) {
      const values: Record<string, string> = {};
      for (const [column, target] of Object.entries(mapping)) {
        if (target && row[column] !== undefined) values[target] = row[column].trim();
      }
      const firstName = values.firstName ? capitalize(values.firstName) : "";
      const lastName = values.lastName ? capitalize(values.lastName) : "";
      if (!firstName || !lastName) {
        skipped.push(`Ligne ${index + 2} : prénom ou nom manquant`);
        continue;
      }
      const cardNumber = values.cardNumber || null;
      if (
        cardNumber &&
        (await tx.member.findUnique({ where: { cardNumber }, select: { id: true } }))
      ) {
        skipped.push(`Ligne ${index + 2} : carte ${cardNumber} déjà attribuée`);
        continue;
      }
      const member = await tx.member.create({
        data: {
          firstName,
          lastName,
          cardNumber,
          notes: values.notes?.slice(0, 500) || null,
          status: "EXPIRED",
        },
      });
      await audit.created("Member", member);
      for (const [target, value] of Object.entries(values)) {
        if (!target.startsWith("game:") || !value) continue;
        const game = gameBySlug.get(target.slice(5));
        if (!game || !matchesPattern(value, game.playerIdPattern)) continue;
        const clash = await tx.memberGameId.findUnique({
          where: { gameId_value: { gameId: game.id, value } },
        });
        if (clash) continue;
        const gid = await tx.memberGameId.create({
          data: { memberId: member.id, gameId: game.id, value },
        });
        await audit.created("MemberGameId", gid);
      }
      created++;
    }
    return { created, skipped };
  },
);
