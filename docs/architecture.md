# L'Ordre du Nautilus — architecture (proposition v1)

Schéma de données : [`prisma/schema.prisma`](../prisma/schema.prisma) (validé avec Prisma 7.10).

## 1. Décisions actées (26/09/2026)

| Sujet                                     | Décision                                                                                                                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Classement, résultats, victoires/défaites | **Supprimés.** Ils sont gérés dans les logiciels officiels des éditeurs. Donc ni `EventResult`, ni `/classement`, ni `hideFromRankings`, ni finalité « publication des résultats » dans le registre. |
| Page `/adherer`                           | Uniquement la marche à suivre PayPal : montant de la formule, adresse PayPal, note à indiquer (nom, prénom, identifiant(s) de jeu : Konami, Bandai…). Aucun paiement intégré.                        |
| Formule Découverte                        | Carte d'information seule (`PlanKind.DISCOVERY`). Elle ne crée jamais d'adhésion et n'apparaît pas dans « Enregistrer une adhésion ». Son bouton mène aux soirées découverte de l'agenda.            |
| Paiement                                  | Mode + montant + référence PayPal **facultative**. La référence est effacée à l'anonymisation.                                                                                                       |
| Reçu fiscal                               | Mention retirée de la formule Soutien.                                                                                                                                                               |
| HelloAsso                                 | Remplacé par PayPal partout (textes de la section Adhésion).                                                                                                                                         |

## 2. Points à valider

1. **Auth.js v5 ou Better Auth.** Auth.js v5 est toujours en bêta (`5.0.0-beta.32`) et n'est plus maintenu que par l'équipe de Better Auth. Il ne sait pas faire « identifiant + mot de passe » avec des sessions en base : il faut écrire un adaptateur maison (c'est ce que prévoit le schéma). Better Auth 1.7, stable, fait tout cela nativement : sessions en base, 2FA TOTP avec codes de secours, limitation de débit, liste et révocation des sessions. Il reste deux ajouts : argon2 (branché via le hash personnalisé) et le verrouillage (via un hook). **Recommandation : Better Auth.** Seules les tables `AdminUser` / `AdminSession` changeraient.
2. **Next.js 15.5 ou 16.** La 15 reçoit encore des correctifs de sécurité, mais la version courante est la 16.3. Pour un projet neuf, **je recommande la 16**. Les écarts sont minimes : `proxy.ts` au lieu de `middleware.ts`, et `updateTag` / `revalidateTag` pour l'invalidation.
3. **Journal d'audit compatible avec l'anonymisation.** Les valeurs des champs personnels (nom, prénom, identifiants, e-mail, notes, référence PayPal) sont masquées dans les diffs. Le journal indique « prénom modifié », sans la valeur. Sans ça, un adhérent anonymisé resterait lisible dans le journal. L'immuabilité est garantie par un trigger PostgreSQL. **Purge au-delà de 12 mois**, comme le recommande la CNIL pour les journaux (6 à 12 mois).
4. **Durées de conservation manquantes dans le cahier des charges** (proposition) :
   - inscriptions aux événements : supprimées 12 mois après l'événement ;
   - messages de contact jamais traités : supprimés 12 mois après réception ;
   - fiche sans aucune adhésion (import, création manuelle) : anonymisée 3 ans après sa création ;
   - fiche mise à la corbeille (`deletedAt`) : anonymisée après 30 jours.
5. **Identification sur les photos étendue à tous les membres**, pas seulement aux mineurs. Pour un adulte aussi, la publication repose sur le consentement. Si un membre retire son accord, ses photos sont dépubliées automatiquement. Les mineurs gardent l'exigence « papier signé ».
6. **Verrouillage après 5 échecs : temporaire (15 min, puis 1 h si ça recommence), pas définitif.** Sinon, n'importe qui pourrait bloquer l'unique compte admin en tapant 5 mauvais mots de passe. Déblocage d'urgence : `pnpm admin:reset`.
7. **Tarif réduit.** Le site actuel mentionne un tarif étudiants / moins de 18 ans. Champ `reducedPriceCents` facultatif sur la formule, affiché sur `/adherer`.
8. **Scans d'autorisation parentale en stockage privé.** Ils ne sont jamais servis par une URL Blob publique, uniquement par une route admin authentifiée : Vercel Blob en accès privé, ou à défaut un bucket S3 compatible avec URL signées.

## 3. Arborescence

```
.
├── prisma/
│   ├── schema.prisma
│   ├── migrations/                  # migration initiale + SQL (CHECK, trigger AuditLog)
│   ├── seed.ts
│   └── seed-assets/                 # 8 photos de démonstration, logo
├── prisma.config.ts
├── public/                          # logo, favicon, images statiques
├── src/
│   ├── app/
│   │   ├── layout.tsx               # polices (next/font), métadonnées, JSON-LD Organization
│   │   ├── (site)/
│   │   │   ├── layout.tsx           # en-tête, pied de page, Lenis
│   │   │   ├── page.tsx             # accueil : toutes les sections actuelles
│   │   │   ├── evenements/
│   │   │   │   ├── page.tsx         # agenda filtrable (jeu, type)
│   │   │   │   └── [slug]/page.tsx  # détail, places restantes, inscription, JSON-LD Event
│   │   │   ├── inscription/annuler/[token]/page.tsx
│   │   │   ├── adherer/page.tsx
│   │   │   ├── galerie/page.tsx
│   │   │   ├── mentions-legales/page.tsx
│   │   │   └── confidentialite/page.tsx
│   │   ├── admin/
│   │   │   ├── connexion/page.tsx
│   │   │   └── (espace)/            # layout : vérification de session côté serveur
│   │   │       ├── page.tsx         # tableau de bord
│   │   │       ├── adherents/       # liste, [id], nouveau, import, fusion
│   │   │       ├── evenements/      # liste, [id], [id]/inscrits, nouveau
│   │   │       ├── galerie/
│   │   │       ├── contenus/        # temoignages, faq, formules, reglages
│   │   │       ├── messages/
│   │   │       ├── journal/
│   │   │       ├── documents/
│   │   │       ├── registre/
│   │   │       └── compte/
│   │   ├── api/
│   │   │   ├── auth/[...all]/route.ts
│   │   │   ├── cron/quotidien/route.ts      # protégé par CRON_SECRET
│   │   │   └── admin/
│   │   │       ├── pdf/[document]/route.ts  # autorisation, carte, émargement, registre
│   │   │       ├── export/[entite]/route.ts # CSV
│   │   │       ├── fichiers/[...cle]/route.ts # scans privés
│   │   │       └── photos/route.ts          # upload + variantes sharp
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   ├── components/
│   │   ├── site/                    # Hero (R3F), Marquee, GameCard, EventRow, Quotes, Masonry, Lightbox, Faq…
│   │   ├── admin/                   # DataTable, CommandSearch, formulaires, dialogues
│   │   ├── motion/                  # LenisProvider, useReveal (GSAP), gestion reduced-motion
│   │   └── ui/                      # boutons, champs, badges partagés
│   ├── server/
│   │   ├── db.ts                    # client Prisma (adaptateur Neon / pg)
│   │   ├── auth/                    # config, mot de passe argon2, TOTP, verrouillage
│   │   ├── service/                 # adminAction(), écriture d'audit, masquage, invalidation du cache
│   │   ├── domain/                  # members, memberships, events, registrations, photos, content, settings, anonymize
│   │   ├── actions/                 # Server Actions : session → zod → domain (fines)
│   │   ├── queries/                 # lectures publiques avec tags de cache
│   │   ├── cron/                    # memberships, events, retention, digest, discord
│   │   ├── mail/                    # Resend + gabarits React Email (admin et confirmation d'inscription)
│   │   ├── pdf/                     # documents @react-pdf/renderer
│   │   ├── storage/                 # blob public (photos), stockage privé (scans)
│   │   ├── images.ts                # variantes thumb / medium / large
│   │   ├── rate-limit.ts
│   │   └── csv.ts
│   ├── lib/                         # schémas zod partagés, env.ts, formats fr-FR, slug, tags de cache
│   ├── generated/prisma/            # client généré (ignoré par git)
│   └── styles/globals.css           # Tailwind 4 : @theme avec la palette validée
├── tests/
│   ├── unit/                        # Vitest : domain, masquage d'audit, règles de publication, dates
│   └── e2e/                         # Playwright : connexion + 2FA, adhésion, inscription, publication photo
├── scripts/
│   ├── admin-reset.ts               # déblocage / nouveau mot de passe en ligne de commande
│   ├── backup.sh
│   └── restore.sh
├── docker-compose.yml               # PostgreSQL local
├── vercel.json                      # déclaration du cron
├── .env.example
└── README.md
```

## 4. Couche service et audit

Toutes les Server Actions admin passent par un seul point d'entrée :

```ts
export const recordMembership = adminAction(
  { entity: "Membership", action: "CREATE", schema: recordMembershipInput, tags: ["members"] },
  async (input, { tx }) => {
    /* logique métier */
  },
);
```

`adminAction` enchaîne dans cet ordre :

1. vérification de la session côté serveur ;
2. validation zod ;
3. lecture de l'état « avant » ;
4. exécution dans une transaction ;
5. calcul du diff avec masquage des champs personnels ;
6. écriture de l'`AuditLog` dans la même transaction ;
7. `revalidateTag` des contenus publics concernés.

Pour qu'aucune écriture ne contourne ce passage, une règle ESLint (`no-restricted-imports`) interdit d'importer le client Prisma ailleurs que dans `server/service`, `server/queries` et `server/cron`.

## 5. Cycle de vie des données

Ce tableau sert de base à la page confidentialité et au registre des traitements.

| Donnée                                                                                  | Base légale                     | Durée                                                                    |
| --------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| Fiche adhérent (nom, prénom, année de naissance, identifiants de jeu, carte, adhésions) | Exécution du contrat d'adhésion | 3 ans après la fin de la dernière adhésion, puis anonymisation           |
| Droit à l'image, autorisation parentale                                                 | Consentement                    | Jusqu'au retrait, au plus tard avec l'anonymisation de la fiche          |
| Inscription à un événement                                                              | Mesures précontractuelles       | E-mail : 7 jours après l'événement ; le reste : 12 mois _(à valider)_    |
| Message de contact                                                                      | Intérêt légitime (répondre)     | 6 mois après traitement ; 12 mois s'il n'est jamais traité _(à valider)_ |
| Journal d'administration                                                                | Intérêt légitime (sécurité)     | 12 mois _(à valider)_                                                    |
| Limitation de débit (IP hachée)                                                         | Intérêt légitime (sécurité)     | 24 h                                                                     |

**Anonymisation** (bouton ou cron, même code) :

- la fiche prend le nom « Ancien membre » ;
- sont effacés : année de naissance, carte, notes, droits, identifiants de jeu, scan ;
- les inscriptions liées sont anonymisées ;
- les photos où le membre est identifié sont dépubliées ;
- les adhésions gardent montant, dates et formule (comptabilité), sans la référence PayPal ;
- une ligne `ANONYMIZE` est ajoutée au journal.

## 6. Tâches planifiées

- **Horaire.** Vercel Cron fonctionne en UTC. `0 4 * * *` tombe à 06:00 l'été et à 05:00 l'hiver. Sur l'offre Hobby, l'exécution peut glisser jusqu'à 59 minutes.
- **Idempotence.** Chaque tâche peut être rejouée sans effet de bord : les paliers d'alerte sont horodatés et les purges se basent sur des dates.
- **Suivi.** Chaque passage est tracé dans `CronRun`, et le tableau de bord signale un cron qui n'a pas tourné depuis plus de 36 h.
