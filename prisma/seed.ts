/**
 * Données initiales. Idempotent : ne recrée rien de ce qui existe déjà.
 *   npm run db:seed                 → contenus + compte admin
 *   SEED_DEMO=true npm run db:seed  → + adhérents et inscriptions fictifs (local uniquement)
 */
import "dotenv/config";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import sharp from "sharp";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { addDays, dayToDbDate, membershipEnd, parisToUtc, todayParis } from "../src/lib/dates";
import { defaultSettings, settingKeys } from "../src/lib/settings";
import { dedupeKey, slugify } from "../src/lib/text";
import { hashPassword } from "../src/server/auth/password";

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.DIRECT_URL ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  }),
});

const GAMES = [
  {
    name: "Magic: The Gathering",
    publisher: "Wizards of the Coast",
    sigil: "M",
    accentColor: "#3A2F5E",
    usualDay: "Vendredi",
    levels: "Débutant à compétitif",
    formats: ["Commander", "Draft", "Standard"],
    playerIdLabel: "Wizards Account",
    // Pseudo Wizards (« Pseudo#12345 ») ; le « @ » est refusé pour ne jamais stocker d'e-mail.
    playerIdPattern: "[^\\s@]{2,32}(#\\d{4,6})?",
    playerIdExample: "Nemo#12345",
  },
  {
    name: "Pokémon",
    publisher: "The Pokémon Company",
    sigil: "P",
    accentColor: "#5E3A2F",
    usualDay: "Mardi",
    levels: "Débutant à intermédiaire",
    formats: ["Standard", "Étendu"],
    playerIdLabel: "Pokémon Player ID",
    playerIdPattern: "\\d{5,10}",
    playerIdExample: "1234567",
  },
  {
    name: "Yu-Gi-Oh!",
    publisher: "Konami",
    sigil: "Y",
    accentColor: "#2F4A5E",
    usualDay: "Mardi",
    levels: "Intermédiaire à compétitif",
    formats: ["Advanced", "Goat"],
    playerIdLabel: "Konami ID",
    playerIdPattern: "\\d{10}",
    playerIdExample: "0123456789",
  },
  {
    name: "Lorcana",
    publisher: "Ravensburger",
    sigil: "L",
    accentColor: "#5E2F4A",
    usualDay: "Vendredi",
    levels: "Débutant à intermédiaire",
    formats: ["Constructed", "Sealed"],
    playerIdLabel: "Ravensburger ID",
    playerIdPattern: "[A-Za-z0-9#_.\\-]{3,40}",
    playerIdExample: "Aurore-2024",
  },
  {
    name: "One Piece Card Game",
    publisher: "Bandai",
    sigil: "O",
    accentColor: "#2F5E4A",
    usualDay: "Samedi mensuel",
    levels: "Débutant à compétitif",
    formats: ["Constructed"],
    playerIdLabel: "Bandai TCG+ ID",
    playerIdPattern: "\\d{6,12}",
    playerIdExample: "123456789",
  },
  {
    name: "Flesh and Blood",
    publisher: "Legend Story Studios",
    sigil: "F",
    accentColor: "#5E4A2F",
    usualDay: "Samedi mensuel",
    levels: "Intermédiaire à compétitif",
    formats: ["Classic Constructed", "Blitz"],
    playerIdLabel: "GEM ID",
    playerIdPattern: "\\d{4,9}",
    playerIdExample: "12345678",
  },
];

const PLANS: Prisma.MembershipPlanCreateInput[] = [
  {
    name: "Découverte",
    slug: "decouverte",
    kind: "DISCOVERY",
    priceCents: 0,
    periodLabel: "une soirée",
    durationDays: null,
    benefits: [
      "Une soirée au choix, tous jeux",
      "Partie guidée avec un référent",
      "Deck de prêt fourni",
      "Accès au Discord pendant un mois",
    ],
    sortOrder: 0,
  },
  {
    name: "Membre",
    slug: "membre",
    kind: "MEMBERSHIP",
    priceCents: 3500,
    reducedPriceCents: 2000,
    periodLabel: "par an",
    durationDays: 365,
    isFeatured: true,
    benefits: [
      "Toutes les soirées de la saison",
      "Tournois mensuels inclus",
      "Tarif membre sur les boosters et sleeves du local",
      "Vote à l'assemblée générale",
      "Places réservées pour le week-end annuel",
    ],
    sortOrder: 1,
  },
  {
    name: "Soutien",
    slug: "soutien",
    kind: "MEMBERSHIP",
    priceCents: 8000,
    periodLabel: "par an",
    durationDays: 365,
    benefits: [
      "Tout le contenu Membre",
      "Un playmat L'Ordre du Nautilus",
      "Nom au tableau des mécènes du local",
    ],
    sortOrder: 2,
  },
];

// Décalage en jours par rapport à la date du seed, pour que l'agenda reste à venir.
const EVENTS = [
  {
    in: 3,
    time: "18:30",
    end: "22:30",
    game: "Pokémon",
    title: "Soirée découverte Pokémon",
    type: "DISCOVERY",
    capacity: null,
    hot: false,
  },
  {
    in: 6,
    time: "19:30",
    end: "23:30",
    game: "Magic: The Gathering",
    title: "Draft du vendredi",
    type: "DRAFT",
    capacity: 8,
    hot: true,
    price: 1500,
  },
  {
    in: 10,
    time: "18:30",
    end: "23:00",
    game: "Yu-Gi-Oh!",
    title: "Table libre Advanced",
    type: "OPEN_PLAY",
    capacity: null,
    hot: false,
  },
  {
    in: 13,
    time: "19:00",
    end: "23:30",
    game: "Lorcana",
    title: "Sealed Lorcana",
    type: "TOURNAMENT",
    capacity: 12,
    hot: false,
    price: 2500,
  },
  {
    in: 21,
    time: "13:00",
    end: "19:00",
    game: "One Piece Card Game",
    title: "Tournoi mensuel One Piece",
    type: "TOURNAMENT",
    capacity: 24,
    hot: true,
    price: 500,
  },
  {
    in: 21,
    time: "15:00",
    end: "20:00",
    game: "Flesh and Blood",
    title: "Blitz Armory",
    type: "TOURNAMENT",
    capacity: 16,
    hot: false,
    price: 500,
  },
  {
    in: 24,
    time: "18:30",
    end: "23:00",
    game: "Pokémon",
    title: "League Challenge",
    type: "TOURNAMENT",
    capacity: 20,
    hot: false,
    price: 500,
  },
  {
    in: 27,
    time: "19:30",
    end: "00:00",
    game: "Magic: The Gathering",
    title: "Commander casual",
    type: "OPEN_PLAY",
    capacity: null,
    hot: false,
  },
  {
    in: 41,
    time: "19:30",
    end: "23:59",
    game: "Magic: The Gathering",
    title: "Prérelease de saison",
    type: "TOURNAMENT",
    capacity: 32,
    hot: true,
    price: 3000,
  },
  {
    in: 49,
    time: "13:00",
    end: "20:00",
    game: "Lorcana",
    title: "Championnat de la Somme",
    type: "TOURNAMENT",
    capacity: 40,
    hot: false,
    price: 1000,
  },
] as const;

const DESCRIPTIONS: Record<string, string> = {
  DISCOVERY:
    "Une soirée pensée pour les débutants : un référent vous prête un deck, joue la première partie avec vous et explique les règles au fil des tours.\n\nAucune connaissance préalable n'est nécessaire.",
  DRAFT:
    "Ouvrez vos boosters, construisez votre deck sur place et affrontez les autres joueurs de la table. Boosters compris dans le prix.",
  OPEN_PLAY: "Tables ouvertes, sans inscription : venez avec votre deck ou empruntez-en un.",
  TOURNAMENT:
    "Tournoi en rondes suisses, résultats saisis dans le logiciel officiel de l'éditeur. Pensez à votre identifiant de joueur.\n\nDotation selon le nombre de participants.",
};

const TESTIMONIALS = [
  {
    quote:
      "Je suis arrivée sans deck et sans connaître personne. Un mardi. Trois mois plus tard je jouais mon premier tournoi avec un deck monté par des membres.",
    displayName: "Camille",
    context: "membre depuis 2025, Pokémon",
  },
  {
    quote:
      "C'est le seul endroit à Amiens où je peux drafter chaque semaine sans que ça tourne au concours de portefeuille.",
    displayName: "Théo",
    context: "membre depuis 2022, Magic",
  },
  {
    quote:
      "Mon fils de 13 ans y va avec moi. On y va pour lui au départ ; maintenant j'ai mon propre deck Lorcana.",
    displayName: "Sophie",
    context: "membre depuis 2024, Lorcana",
  },
];

const FAQ = [
  {
    question: "Je débute complètement, c'est un problème ?",
    answer:
      "Non, c'est même le cas le plus fréquent. Les soirées découverte sont pensées pour ça : un référent vous prête un deck, joue la première partie avec vous et explique les règles au fil des tours. Personne ne vous demandera de connaître la méta.",
  },
  {
    question: "Faut-il apporter ses cartes ?",
    answer:
      "Si vous en avez, oui. Sinon, l'association dispose de decks de prêt pour chaque jeu pratiqué. Il suffit de le préciser à l'arrivée.",
  },
  {
    question: "Y a-t-il un âge minimum ?",
    answer:
      "Les soirées sont ouvertes dès 12 ans, accompagné d'un parent en dessous de 16 ans. Les tournois avec dotation suivent les règles d'âge de chaque éditeur.",
  },
  {
    question: "Où et quand se passent les soirées ?",
    answer:
      "Dans notre local à Amiens, les mardis, vendredis et un samedi par mois. Les horaires précis de chaque soirée sont dans l'agenda.",
  },
  {
    question: "Peut-on venir juste pour échanger ou vendre des cartes ?",
    answer:
      "Les échanges entre membres sont bienvenus pendant les soirées. La vente n'est pas l'objet de l'association, mais un coin trade est mis en place lors des tournois mensuels.",
  },
  {
    question: "Comment savoir s'il reste des places ?",
    answer:
      "Chaque événement de l'agenda indique le nombre de places restantes. Pour les soirées libres, il n'y a pas d'inscription : vous venez, il y a toujours une table.",
  },
];

const PHOTOS = [
  {
    h: 260,
    caption: "Les tables du vendredi",
    alt: "Plusieurs tables de joueurs pendant une soirée du vendredi",
  },
  {
    h: 180,
    caption: "Finale du tournoi One Piece",
    alt: "Deux joueurs face à face pendant la finale d'un tournoi One Piece",
  },
  { h: 220, caption: "Le coin trade", alt: "Classeurs de cartes ouverts sur une table d'échange" },
  { h: 200, caption: "Week-end annuel", alt: "Le groupe de membres réuni lors du week-end annuel" },
  {
    h: 280,
    caption: "Partie guidée",
    alt: "Un référent explique les règles à une nouvelle joueuse",
  },
  {
    h: 170,
    caption: "Le local",
    alt: "Le local de l'association avec ses tables prêtes à accueillir les joueurs",
  },
  {
    h: 240,
    caption: "Podium mensuel",
    alt: "Les trois premiers du tournoi mensuel avec leurs lots",
  },
  { h: 190, caption: "Les decks de prêt", alt: "Une étagère de decks de prêt rangés par jeu" },
];

/** Photos de démonstration générées (dégradés de la palette), écrites dans public/demo. */
async function demoPhotoFiles(index: number, heightHint: number, caption: string) {
  const dir = path.join(process.cwd(), "public", "demo");
  await mkdir(dir, { recursive: true });
  const width = 1200;
  const height = Math.round((heightHint / 240) * 900);
  const hues = [
    "#243D5A",
    "#2A4A6B",
    "#1B3149",
    "#3A2F5E",
    "#2F4A5E",
    "#5E2F4A",
    "#2F5E4A",
    "#5E4A2F",
  ];
  const accent = hues[index % hues.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="#0C1826"/></linearGradient>
      <radialGradient id="r" cx="0.3" cy="0.3" r="0.6"><stop offset="0" stop-color="#DDA5A7" stop-opacity="0.35"/><stop offset="1" stop-color="#DDA5A7" stop-opacity="0"/></radialGradient>
      <radialGradient id="b" cx="0.75" cy="0.8" r="0.5"><stop offset="0" stop-color="#C8A96E" stop-opacity="0.3"/><stop offset="1" stop-color="#C8A96E" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#r)"/><rect width="100%" height="100%" fill="url(#b)"/>
    <text x="50%" y="50%" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="44" fill="#F3EFE7" fill-opacity="0.75">[Photo : ${caption.toLowerCase()}]</text>
  </svg>`;
  const base = sharp(Buffer.from(svg));
  const out = { thumb: "", medium: "", large: "" };
  for (const [name, size] of [
    ["thumb", 480],
    ["medium", 1000],
    ["large", 1920],
  ] as const) {
    const file = path.join(dir, `photo-${index + 1}-${name}.webp`);
    if (!existsSync(file)) {
      await writeFile(
        file,
        await base
          .clone()
          .resize({ width: size, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer(),
      );
    }
    out[name] = `/demo/photo-${index + 1}-${name}.webp`;
  }
  const blur = await base.clone().resize(16).webp({ quality: 40 }).toBuffer();
  return {
    ...out,
    width,
    height,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
  };
}

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@ordredunautilus.fr").toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  const existing = await db.adminUser.findFirst();
  if (existing) {
    console.log(`• Compte admin déjà présent (${existing.email})`);
    return;
  }
  if (!password || password.length < 12) {
    throw new Error("ADMIN_INITIAL_PASSWORD doit contenir au moins 12 caractères.");
  }
  const user = await db.adminUser.create({
    data: { name: "Administrateur", email, emailVerified: true },
  });
  await db.adminAccount.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: await hashPassword(password),
    },
  });
  console.log(`• Compte admin créé : ${email}`);
}

async function seedContent() {
  if ((await db.game.count()) > 0) {
    console.log("• Contenus déjà présents, rien à faire");
    return;
  }
  const games = new Map<string, string>();
  for (const [i, g] of GAMES.entries()) {
    const created = await db.game.create({ data: { ...g, slug: slugify(g.name), sortOrder: i } });
    games.set(g.name, created.id);
  }
  for (const p of PLANS) await db.membershipPlan.create({ data: p });

  const today = todayParis();
  for (const e of EVENTS) {
    const day = addDays(today, e.in);
    const startsAt = parisToUtc(day, e.time);
    let endsAt = parisToUtc(day, e.end);
    if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 86_400_000);
    await db.event.create({
      data: {
        title: e.title,
        slug: slugify(`${e.title} ${day}`),
        gameId: games.get(e.game) ?? null,
        type: e.type,
        startsAt,
        endsAt,
        description: DESCRIPTIONS[e.type],
        capacity: e.capacity,
        priceCents: "price" in e ? e.price : null,
        isHot: e.hot,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
  }

  for (const [i, p] of PHOTOS.entries()) {
    const files = await demoPhotoFiles(i, p.h, p.caption);
    await db.photo.create({
      data: {
        storageKey: `demo/photo-${i + 1}`,
        thumbUrl: files.thumb,
        mediumUrl: files.medium,
        largeUrl: files.large,
        width: files.width,
        height: files.height,
        blurDataUrl: files.blurDataUrl,
        alt: p.alt,
        caption: p.caption,
        sortOrder: i,
        isPublished: true,
        publishedAt: new Date(),
      },
    });
  }

  for (const [i, t] of TESTIMONIALS.entries()) {
    await db.testimonial.create({ data: { ...t, isPublished: true, sortOrder: i } });
  }
  for (const [i, f] of FAQ.entries()) {
    await db.faqItem.create({ data: { ...f, isPublished: true, sortOrder: i } });
  }
  for (const key of settingKeys) {
    await db.siteSetting.upsert({
      where: { key },
      create: { key, value: defaultSettings[key] as Prisma.InputJsonValue },
      update: {},
    });
  }
  console.log("• Jeux, formules, 10 événements, 8 photos, témoignages, FAQ et réglages créés");
}

/** Adhérents fictifs pour essayer l'administration (jamais en production). */
async function seedDemoMembers() {
  if (process.env.SEED_DEMO !== "true") return;
  if ((await db.member.count()) > 0) {
    console.log("• Adhérents déjà présents, démo ignorée");
    return;
  }
  const plan = await db.membershipPlan.findUniqueOrThrow({ where: { slug: "membre" } });
  const soutien = await db.membershipPlan.findUniqueOrThrow({ where: { slug: "soutien" } });
  const games = await db.game.findMany();
  const bySlug = new Map(games.map((g) => [g.slug, g.id]));
  const today = todayParis();

  const people = [
    {
      firstName: "Camille",
      lastName: "Durand",
      start: -200,
      game: ["pokemon", "1234567"],
      plan,
      card: "NAU-2026-001",
    },
    {
      firstName: "Théo",
      lastName: "Lefèvre",
      start: -350,
      game: ["magic-the-gathering", "Theo#20451"],
      plan: soutien,
      card: "NAU-2025-014",
    },
    {
      firstName: "Inès",
      lastName: "Martin",
      start: -60,
      game: ["lorcana", "Ines-L"],
      plan,
      card: "NAU-2026-002",
    },
    {
      firstName: "Hugo",
      lastName: "Bernard",
      start: -390,
      game: ["yu-gi-oh", "0123456789"],
      plan,
      card: "NAU-2025-009",
    },
    {
      firstName: "Léa",
      lastName: "Petit",
      start: -340,
      game: ["one-piece-card-game", "987654321"],
      plan,
      card: "NAU-2025-011",
    },
    {
      firstName: "Nathan",
      lastName: "Roux",
      start: -10,
      game: ["flesh-and-blood", "4567891"],
      plan: soutien,
      card: "NAU-2026-003",
    },
  ];
  for (const p of people) {
    const startDate = addDays(today, p.start);
    const endDate = membershipEnd(startDate, 365);
    const member = await db.member.create({
      data: {
        firstName: p.firstName,
        lastName: p.lastName,
        cardNumber: p.card,
        status: endDate >= today ? "ACTIVE" : "EXPIRED",
        imageRightsGallery: true,
        imageRightsGallerySource: "VERBAL",
        imageRightsGalleryAt: dayToDbDate(startDate),
      },
    });
    const gameId = bySlug.get(p.game[0]!);
    if (gameId)
      await db.memberGameId.create({ data: { memberId: member.id, gameId, value: p.game[1]! } });
    await db.membership.create({
      data: {
        memberId: member.id,
        planId: p.plan.id,
        startDate: dayToDbDate(startDate),
        endDate: dayToDbDate(endDate),
        amountCents: p.plan.priceCents,
        paymentMethod: "PAYPAL",
        transactionRef: `DEMO${Math.abs(p.start)}X`,
        cardHandedOverAt: new Date(),
      },
    });
  }

  const draft = await db.event.findFirst({ where: { title: "Draft du vendredi" } });
  if (draft) {
    const names = [
      ["Camille", "Durand"],
      ["Théo", "Lefèvre"],
      ["Hugo", "Bernard"],
      ["Jules", "Moreau"],
      ["Chloé", "Laurent"],
      ["Arthur", "Simon"],
      ["Manon", "Michel"],
    ];
    for (const [firstName, lastName] of names) {
      await db.eventRegistration.create({
        data: {
          eventId: draft.id,
          firstName: firstName!,
          lastName: lastName!,
          dedupeKey: dedupeKey(firstName!, lastName!),
          playerId: `${firstName}#${Math.floor(10000 + Math.random() * 89999)}`,
          status: "REGISTERED",
          source: "PUBLIC",
        },
      });
    }
  }
  await db.contactMessage.create({
    data: {
      firstName: "Julie",
      email: "julie.exemple@example.com",
      game: "Lorcana",
      message:
        "Bonjour, je n'ai jamais joué à Lorcana, est-ce que je peux venir un vendredi sans deck ?",
    },
  });
  console.log("• Démo : 6 adhérents, 7 inscrits au draft, 1 message");
}

async function main() {
  await seedAdmin();
  await seedContent();
  await seedDemoMembers();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
