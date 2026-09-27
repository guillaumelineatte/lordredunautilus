import Papa from "papaparse";
import { auditActionLabel, entityLabel, memberStatusLabel, paymentMethodLabel } from "@/lib/labels";
import { formatDateTime, formatDay } from "@/lib/format";
import { adminFromRequest, attachment, unauthorized } from "@/server/auth/route-guard";
import { db } from "@/server/db";
import { metaFromHeaders } from "@/server/request";
import { writeAudit } from "@/server/service/audit";

export const dynamic = "force-dynamic";

async function membersCsv() {
  const members = await db.member.findMany({
    where: { deletedAt: null, anonymizedAt: null },
    include: {
      gameIds: { include: { game: { select: { name: true } } } },
      memberships: {
        orderBy: { endDate: "desc" },
        take: 1,
        include: { plan: { select: { name: true } } },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return members.map((m) => {
    const last = m.memberships[0];
    return {
      Nom: m.lastName,
      Prénom: m.firstName,
      "N° de carte": m.cardNumber ?? "",
      Statut: memberStatusLabel[m.status],
      "Identifiants de jeu": m.gameIds.map((g) => `${g.game.name} : ${g.value}`).join(" | "),
      "Dernière formule": last?.plan.name ?? "",
      "Fin d'adhésion": last ? formatDay(last.endDate) : "",
      "Galerie autorisée": m.imageRightsGallery ? "oui" : "non",
      "Réseaux autorisés": m.imageRightsSocial ? "oui" : "non",
    };
  });
}

async function membershipsCsv() {
  const rows = await db.membership.findMany({
    include: { member: true, plan: true, renewedBy: { select: { id: true } } },
    orderBy: { startDate: "desc" },
  });
  return rows.map((r) => ({
    Adhérent: r.member.anonymizedAt
      ? "Ancien membre"
      : `${r.member.lastName} ${r.member.firstName}`,
    Formule: r.plan.name,
    Début: formatDay(r.startDate),
    Fin: formatDay(r.endDate),
    Montant: (r.amountCents / 100).toFixed(2).replace(".", ","),
    Paiement: paymentMethodLabel[r.paymentMethod],
    Référence: r.transactionRef ?? "",
    Renouvelée: r.renewedBy ? "oui" : "non",
    "Carte remise": r.cardHandedOverAt ? formatDay(r.cardHandedOverAt) : "",
  }));
}

async function auditCsv(params: URLSearchParams) {
  const entity = params.get("entite") || undefined;
  const action = params.get("action") || undefined;
  const rows = await db.auditLog.findMany({
    where: {
      ...(entity ? { entity } : {}),
      ...(action ? { action: action as keyof typeof auditActionLabel } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 10_000,
  });
  return rows.map((r) => ({
    Date: formatDateTime(r.createdAt),
    Action: auditActionLabel[r.action],
    Auteur: r.actor === "SYSTEM" ? "Tâche planifiée" : "Administrateur",
    Élément: entityLabel[r.entity] ?? r.entity,
    Identifiant: r.entityId ?? "",
    Détail: r.diff ? JSON.stringify(r.diff) : "",
    IP: r.ip ?? "",
  }));
}

async function eventRegistrationsCsv(eventId: string) {
  const rows = await db.eventRegistration.findMany({
    where: { eventId },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    Nom: r.lastName,
    Prénom: r.firstName,
    Identifiant: r.playerId ?? "",
    Statut: r.status,
    Inscription: formatDateTime(r.createdAt),
  }));
}

/** Droit d'accès / portabilité (art. 15 et 20 RGPD) : toutes les données d'un adhérent, en JSON. */
async function memberDataJson(memberId: string) {
  const m = await db.member.findUnique({
    where: { id: memberId },
    include: {
      gameIds: { include: { game: { select: { name: true, playerIdLabel: true } } } },
      memberships: { include: { plan: { select: { name: true } } }, orderBy: { startDate: "asc" } },
      registrations: {
        include: { event: { select: { title: true, startsAt: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!m || m.anonymizedAt) return null;
  return {
    genereLe: new Date().toISOString(),
    responsableDuTraitement: "L'Ordre du Nautilus",
    identite: {
      prenom: m.firstName,
      nom: m.lastName,
      numeroDeCarte: m.cardNumber,
    },
    statut: memberStatusLabel[m.status],
    notesInternes: m.notes,
    identifiantsDeJeu: m.gameIds.map((g) => ({
      jeu: g.game.name,
      libelle: g.game.playerIdLabel,
      valeur: g.value,
    })),
    adhesions: m.memberships.map((a) => ({
      formule: a.plan.name,
      debut: formatDay(a.startDate),
      fin: formatDay(a.endDate),
      montant: a.amountCents / 100,
      paiement: paymentMethodLabel[a.paymentMethod],
      referenceTransaction: a.transactionRef,
      carteRemiseLe: a.cardHandedOverAt ? formatDay(a.cardHandedOverAt) : null,
    })),
    autorisations: {
      galerie: {
        accordee: m.imageRightsGallery,
        le: m.imageRightsGalleryAt ? formatDay(m.imageRightsGalleryAt) : null,
        source: m.imageRightsGallerySource,
      },
      reseaux: {
        accordee: m.imageRightsSocial,
        le: m.imageRightsSocialAt ? formatDay(m.imageRightsSocialAt) : null,
        source: m.imageRightsSocialSource,
      },
    },
    inscriptionsAuxEvenements: m.registrations.map((r) => ({
      evenement: r.event.title,
      date: formatDay(r.event.startsAt),
      statut: r.status,
    })),
    creeLe: formatDay(m.createdAt),
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ entite: string }> }) {
  const admin = await adminFromRequest(req);
  if (!admin) return unauthorized();
  const { entite } = await params;
  const url = new URL(req.url);

  if (entite === "fiche") {
    const memberId = url.searchParams.get("adherent") ?? "";
    const data = await memberDataJson(memberId);
    if (!data) return Response.json({ error: "Fiche introuvable." }, { status: 404 });
    await writeAudit(db, {
      action: "EXPORT",
      entity: "Member",
      entityId: memberId,
      diff: { export: { before: null, after: "Données de l'adhérent (droit d'accès)" } },
      meta: metaFromHeaders(req.headers),
    });
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": attachment(
          `donnees-${data.identite.prenom}-${data.identite.nom}.json`.toLowerCase(),
        ),
        "Cache-Control": "no-store",
      },
    });
  }

  let rows: Record<string, string | number>[];
  let filename: string;
  if (entite === "adherents") {
    rows = await membersCsv();
    filename = "adherents.csv";
  } else if (entite === "adhesions") {
    rows = await membershipsCsv();
    filename = "adhesions.csv";
  } else if (entite === "journal") {
    rows = await auditCsv(url.searchParams);
    filename = "journal.csv";
  } else if (entite === "inscrits" && url.searchParams.get("evenement")) {
    rows = await eventRegistrationsCsv(url.searchParams.get("evenement") ?? "");
    filename = "inscrits.csv";
  } else {
    return Response.json({ error: "Export inconnu." }, { status: 404 });
  }

  await writeAudit(db, {
    action: "EXPORT",
    entity:
      entite === "journal" ? "System" : entite === "inscrits" ? "EventRegistration" : "Member",
    diff: { export: { before: null, after: `${filename} (${rows.length} lignes)` } },
    meta: metaFromHeaders(req.headers),
  });

  // BOM pour qu'Excel lise correctement les accents ; séparateur « ; » (usage français).
  const csv = "﻿" + Papa.unparse(rows, { delimiter: ";" });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": attachment(filename),
      "Cache-Control": "no-store",
    },
  });
}
