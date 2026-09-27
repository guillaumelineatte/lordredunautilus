import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { AuditAction, EventStatus, MemberStatus } from "@/generated/prisma/enums";
import { PAGE_SIZE, type ListParams } from "@/components/admin/table";
import { addDays, dayToDbDate, parisToUtc, todayParis } from "@/lib/dates";
import { dedupeKey } from "@/lib/text";
import { db } from "../db";

const ACTIVE_MEMBER = { deletedAt: null, anonymizedAt: null } satisfies Prisma.MemberWhereInput;

export function unreadMessagesCount() {
  return db.contactMessage.count({ where: { status: "NEW" } });
}

// ── Tableau de bord ────────────────────────────────────────

export async function dashboardData() {
  const today = todayParis();
  const startOfToday = parisToUtc(today, "00:00");
  const memberInclude = {
    member: { include: { gameIds: { include: { game: { select: { name: true } } } } } },
    plan: { select: { name: true } },
  } satisfies Prisma.MembershipInclude;

  const [
    expiring,
    expiredRecently,
    todayRegs,
    unread,
    lastMessages,
    upcoming,
    lastAudit,
    lastCron,
  ] = await Promise.all([
    db.membership.findMany({
      where: {
        renewedBy: null,
        endDate: { gte: dayToDbDate(today), lte: dayToDbDate(addDays(today, 30)) },
        member: ACTIVE_MEMBER,
      },
      include: memberInclude,
      orderBy: { endDate: "asc" },
    }),
    db.membership.findMany({
      where: {
        renewedBy: null,
        endDate: { gte: dayToDbDate(addDays(today, -90)), lt: dayToDbDate(today) },
        member: {
          ...ACTIVE_MEMBER,
          memberships: { none: { endDate: { gte: dayToDbDate(today) } } },
        },
      },
      include: memberInclude,
      orderBy: { endDate: "desc" },
    }),
    db.eventRegistration.findMany({
      where: { createdAt: { gte: startOfToday }, event: { deletedAt: null } },
      include: { event: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.contactMessage.count({ where: { status: "NEW" } }),
    db.contactMessage.findMany({
      where: { status: "NEW" },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    db.event.findMany({
      where: { status: "PUBLISHED", deletedAt: null, startsAt: { gte: new Date() } },
      include: {
        game: { select: { name: true } },
        _count: {
          select: { registrations: { where: { status: { in: ["REGISTERED", "PRESENT"] } } } },
        },
      },
      orderBy: { startsAt: "asc" },
      take: 6,
    }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.cronRun.findFirst({ orderBy: { startedAt: "desc" } }),
  ]);

  const cronLate = !lastCron || Date.now() - lastCron.startedAt.getTime() > 36 * 3600_000;

  return {
    expiring,
    expiredRecently,
    todayRegs,
    unread,
    lastMessages,
    upcoming,
    lastAudit,
    lastCron,
    cronLate,
  };
}

// ── Adhérents ──────────────────────────────────────────────

export async function listMembers(p: ListParams) {
  const trash = p.filters.status === "corbeille";
  const where: Prisma.MemberWhereInput = {
    anonymizedAt: null,
    deletedAt: trash ? { not: null } : null,
    ...(p.filters.status && !trash ? { status: p.filters.status as MemberStatus } : {}),
    ...(p.filters.jeu ? { gameIds: { some: { game: { slug: p.filters.jeu } } } } : {}),
    ...(p.q
      ? {
          OR: [
            { firstName: { contains: p.q, mode: "insensitive" } },
            { lastName: { contains: p.q, mode: "insensitive" } },
            { cardNumber: { contains: p.q, mode: "insensitive" } },
            { gameIds: { some: { value: { contains: p.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.MemberOrderByWithRelationInput[] =
    p.sort === "firstName"
      ? [{ firstName: p.dir }, { lastName: p.dir }]
      : p.sort === "lastName"
        ? [{ lastName: p.dir }, { firstName: p.dir }]
        : [{ [p.sort]: p.dir }];

  const [total, rows] = await Promise.all([
    db.member.count({ where }),
    db.member.findMany({
      where,
      orderBy,
      skip: (p.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        gameIds: { include: { game: { select: { name: true, sigil: true } } } },
        memberships: {
          orderBy: { endDate: "desc" },
          take: 1,
          include: { plan: { select: { name: true } } },
        },
        _count: { select: { memberships: true } },
      },
    }),
  ]);
  return { total, rows };
}

export async function getMemberDetail(id: string) {
  const member = await db.member.findUnique({
    where: { id },
    include: {
      gameIds: { include: { game: true }, orderBy: { game: { sortOrder: "asc" } } },
      memberships: {
        include: {
          plan: true,
          renewedBy: { select: { id: true } },
          renewedFrom: { select: { id: true } },
        },
        orderBy: { startDate: "desc" },
      },
      registrations: {
        include: { event: { select: { id: true, title: true, startsAt: true } } },
        orderBy: { createdAt: "desc" },
        take: 15,
      },
      _count: { select: { taggedPhotos: true } },
    },
  });
  if (!member) return null;
  const history = await db.auditLog.findMany({
    where: { entity: "Member", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  return { member, history };
}

/** Doublons probables : même nom + prénom normalisés. */
export async function findDuplicateGroups() {
  const members = await db.member.findMany({
    where: ACTIVE_MEMBER,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      cardNumber: true,
      createdAt: true,
      _count: { select: { memberships: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const groups = new Map<string, typeof members>();
  for (const m of members) {
    const key = dedupeKey(m.firstName, m.lastName);
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

export function memberOptions() {
  return db.member.findMany({
    where: ACTIVE_MEMBER,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      imageRightsGallery: true,
      imageRightsGallerySource: true,
      cardNumber: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 2000,
  });
}

export function planOptions() {
  return db.membershipPlan.findMany({ orderBy: { sortOrder: "asc" } });
}

export function gameOptions(includeInactive = false) {
  return db.game.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

// ── Événements ─────────────────────────────────────────────

export async function listEvents(p: ListParams) {
  const now = new Date();
  const trash = p.filters.statut === "corbeille";
  const where: Prisma.EventWhereInput = {
    deletedAt: trash ? { not: null } : null,
    ...(p.filters.statut && !trash ? { status: p.filters.statut as EventStatus } : {}),
    ...(p.filters.jeu ? { game: { slug: p.filters.jeu } } : {}),
    ...(p.filters.periode === "passes"
      ? { startsAt: { lt: now } }
      : p.filters.periode === "tous"
        ? {}
        : trash
          ? {}
          : { startsAt: { gte: parisToUtc(todayParis(), "00:00") } }),
    ...(p.q ? { title: { contains: p.q, mode: "insensitive" } } : {}),
  };
  const [total, rows] = await Promise.all([
    db.event.count({ where }),
    db.event.findMany({
      where,
      orderBy: { [p.sort]: p.dir },
      skip: (p.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        game: { select: { name: true } },
        _count: {
          select: {
            registrations: { where: { status: { in: ["REGISTERED", "PRESENT"] } } },
          },
        },
      },
    }),
  ]);
  const waitlists = await db.eventRegistration.groupBy({
    by: ["eventId"],
    where: { eventId: { in: rows.map((r) => r.id) }, status: "WAITLISTED" },
    _count: true,
  });
  const waitBy = new Map(waitlists.map((w) => [w.eventId, w._count]));
  return { total, rows: rows.map((r) => ({ ...r, waitlisted: waitBy.get(r.id) ?? 0 })) };
}

export function getEventAdmin(id: string) {
  return db.event.findUnique({
    where: { id },
    include: {
      game: true,
      registrations: {
        include: {
          member: { select: { id: true, firstName: true, lastName: true, cardNumber: true } },
        },
        orderBy: [{ createdAt: "asc" }],
      },
      _count: { select: { photos: true } },
    },
  });
}

export function eventOptions() {
  return db.event.findMany({
    where: { deletedAt: null },
    select: { id: true, title: true, startsAt: true },
    orderBy: { startsAt: "desc" },
    take: 200,
  });
}

// ── Galerie ────────────────────────────────────────────────

export function listPhotos() {
  return db.photo.findMany({
    where: { deletedAt: null },
    include: {
      event: { select: { id: true, title: true, startsAt: true } },
      taggedMembers: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          imageRightsGallery: true,
          imageRightsGallerySource: true,
          anonymizedAt: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

// ── Messages ───────────────────────────────────────────────

export async function listMessages(p: ListParams) {
  const where: Prisma.ContactMessageWhereInput = {
    ...(p.filters.statut === "traites"
      ? { status: "HANDLED" }
      : p.filters.statut === "tous"
        ? {}
        : { status: "NEW" }),
    ...(p.q
      ? {
          OR: [
            { firstName: { contains: p.q, mode: "insensitive" } },
            { email: { contains: p.q, mode: "insensitive" } },
            { message: { contains: p.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    db.contactMessage.count({ where }),
    db.contactMessage.findMany({
      where,
      orderBy: { createdAt: p.dir },
      skip: (p.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return { total, rows };
}

// ── Journal ────────────────────────────────────────────────

export async function listAudit(p: ListParams) {
  const from = p.filters.du ? parisToUtc(p.filters.du, "00:00") : undefined;
  const to = p.filters.au ? parisToUtc(addDays(p.filters.au, 1), "00:00") : undefined;
  const where: Prisma.AuditLogWhereInput = {
    ...(p.filters.entite ? { entity: p.filters.entite } : {}),
    ...(p.filters.action ? { action: p.filters.action as AuditAction } : {}),
    ...(from || to
      ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } }
      : {}),
    ...(p.q ? { entityId: { contains: p.q } } : {}),
  };
  const size = 50;
  const [total, rows] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: p.dir },
      skip: (p.page - 1) * size,
      take: size,
    }),
  ]);
  return { total, rows, size };
}

/** Libellés lisibles des éléments référencés par le journal (résolus à l'affichage). */
export async function auditTargets(rows: { entity: string; entityId: string | null }[]) {
  const ids = (entity: string) =>
    rows.filter((r) => r.entity === entity && r.entityId).map((r) => r.entityId as string);
  const [members, events] = await Promise.all([
    db.member.findMany({
      where: { id: { in: ids("Member") } },
      select: { id: true, firstName: true, lastName: true, anonymizedAt: true },
    }),
    db.event.findMany({ where: { id: { in: ids("Event") } }, select: { id: true, title: true } }),
  ]);
  const map = new Map<string, { label: string; href: string }>();
  for (const m of members) {
    map.set(`Member:${m.id}`, {
      label: m.anonymizedAt ? "Ancien membre" : `${m.firstName} ${m.lastName}`,
      href: `/timonerie/adherents/${m.id}`,
    });
  }
  for (const e of events)
    map.set(`Event:${e.id}`, { label: e.title, href: `/timonerie/evenements/${e.id}` });
  return map;
}

// ── Compte ─────────────────────────────────────────────────

export async function accountData(userId: string) {
  const [user, sessions] = await Promise.all([
    db.adminUser.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    db.adminSession.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  return { user, sessions };
}

// ── Contenus ───────────────────────────────────────────────

export function listTestimonials() {
  return db.testimonial.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
}

export function listFaq() {
  return db.faqItem.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
}

export async function listPlansWithCounts() {
  const plans = await db.membershipPlan.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { memberships: true } } },
  });
  return plans.map(({ _count, ...p }) => ({ ...p, memberships: _count.memberships }));
}

export async function adminSettings() {
  const { loadSettings } = await import("../settings");
  return loadSettings(db);
}

export async function documentOptions() {
  const [members, events] = await Promise.all([
    db.member.findMany({
      where: ACTIVE_MEMBER,
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.event.findMany({
      where: {
        deletedAt: null,
        type: { not: "OPEN_PLAY" },
        startsAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
      },
      select: { id: true, title: true, startsAt: true },
      orderBy: { startsAt: "asc" },
    }),
  ]);
  return { members, events };
}
