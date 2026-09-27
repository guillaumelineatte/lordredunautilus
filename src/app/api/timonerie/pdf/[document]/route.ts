import { renderToBuffer } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { formatDay } from "@/lib/format";
import { PROCESSINGS } from "@/lib/processing-register";
import { formatAddress } from "@/lib/settings";
import { seasonLabel, todayParis } from "@/lib/dates";
import { slugify } from "@/lib/text";
import { adminFromRequest, attachment, unauthorized } from "@/server/auth/route-guard";
import { db } from "@/server/db";
import { describeEvent } from "@/server/domain/registrations";
import {
  AttendanceSheetPdf,
  MemberCardPdf,
  ParentalConsentPdf,
  ProcessingRegisterPdf,
} from "@/server/pdf/documents";
import { registerFonts } from "@/server/pdf/theme";
import { metaFromHeaders } from "@/server/request";
import { writeAudit } from "@/server/service/audit";
import { loadSettings } from "@/server/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Built = {
  element: ReactElement<DocumentProps>;
  filename: string;
  entity: string;
  entityId: string | null;
};

async function build(document: string, params: URLSearchParams): Promise<Built | null> {
  const settings = await loadSettings(db);
  const associationName = settings.legal.associationName;

  if (document === "autorisation-parentale") {
    const memberId = params.get("adherent");
    const member = memberId
      ? await db.member.findFirst({ where: { id: memberId, anonymizedAt: null } })
      : null;
    return {
      element: createElement(ParentalConsentPdf, {
        associationName,
        associationAddress: settings.legal.siege || formatAddress(settings.address),
        contactEmail: settings.contactEmail,
        child: member ? { firstName: member.firstName, lastName: member.lastName } : null,
        date: formatDay(todayParis()),
      }) as ReactElement<DocumentProps>,
      filename: member
        ? `autorisation-parentale-${slugify(`${member.firstName} ${member.lastName}`)}.pdf`
        : "autorisation-parentale.pdf",
      entity: member ? "Member" : "Document",
      entityId: member?.id ?? null,
    };
  }

  if (document === "carte") {
    const member = await db.member.findFirst({
      where: { id: params.get("adherent") ?? "", anonymizedAt: null },
      include: { gameIds: { include: { game: { select: { name: true } } } } },
    });
    if (!member) return null;
    return {
      element: createElement(MemberCardPdf, {
        firstName: member.firstName,
        lastName: member.lastName,
        cardNumber: member.cardNumber,
        season: seasonLabel(),
        games: member.gameIds.map((g) => g.game.name),
        associationName,
        contactEmail: settings.contactEmail,
        size: params.get("format") === "a6" ? "A6" : "CR80",
      }) as ReactElement<DocumentProps>,
      filename: `carte-${slugify(`${member.firstName} ${member.lastName}`)}.pdf`,
      entity: "Member",
      entityId: member.id,
    };
  }

  if (document === "emargement") {
    const event = await db.event.findFirst({
      where: { id: params.get("evenement") ?? "" },
      include: {
        game: true,
        registrations: {
          where: { status: { in: ["REGISTERED", "PRESENT", "WAITLISTED"] } },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        },
      },
    });
    if (!event) return null;
    const { when, where } = describeEvent(event, formatAddress(settings.address));
    const toRow = (r: (typeof event.registrations)[number]) => ({
      firstName: r.firstName,
      lastName: r.lastName,
      playerId: r.playerId,
      isMinor: r.isMinor,
      status: r.status,
    });
    const registered = event.registrations.filter((r) => r.status !== "WAITLISTED").map(toRow);
    const waitlisted = event.registrations
      .filter((r) => r.status === "WAITLISTED")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(toRow);
    return {
      element: createElement(AttendanceSheetPdf, {
        associationName,
        eventTitle: event.title,
        when,
        where,
        gameName: event.game?.name ?? null,
        playerIdLabel: event.game?.playerIdLabel ?? null,
        registered,
        waitlisted,
        blankRows: Math.max(
          4,
          Math.min(10, (event.capacity ?? registered.length + 6) - registered.length),
        ),
      }) as ReactElement<DocumentProps>,
      filename: `emargement-${event.slug}.pdf`,
      entity: "Event",
      entityId: event.id,
    };
  }

  if (document === "registre") {
    return {
      element: createElement(ProcessingRegisterPdf, {
        processings: PROCESSINGS,
        associationName,
        controller: settings.legal.president,
        contactEmail: settings.contactEmail,
        updatedAt: new Date(),
      }) as ReactElement<DocumentProps>,
      filename: "registre-des-traitements.pdf",
      entity: "Document",
      entityId: null,
    };
  }
  return null;
}

export async function GET(req: Request, { params }: { params: Promise<{ document: string }> }) {
  const admin = await adminFromRequest(req);
  if (!admin) return unauthorized();

  const { document } = await params;
  const url = new URL(req.url);
  registerFonts();
  const built = await build(document, url.searchParams);
  if (!built) return Response.json({ error: "Document introuvable." }, { status: 404 });

  const buffer = await renderToBuffer(built.element);
  await writeAudit(db, {
    action: "PDF_GENERATED",
    entity: built.entity,
    entityId: built.entityId,
    diff: { document: { before: null, after: document } },
    meta: metaFromHeaders(req.headers),
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": attachment(built.filename, url.searchParams.get("apercu") === "1"),
      "Cache-Control": "no-store",
    },
  });
}
