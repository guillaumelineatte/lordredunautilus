# L'Ordre du Nautilus — architecture

Schéma de données : [`prisma/schema.prisma`](../prisma/schema.prisma). Mode d'emploi et déploiement : [README](../README.md).

## 1. Décisions

| Sujet                 | Décision                                                                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Classement, résultats | Supprimés : gérés dans les logiciels officiels des éditeurs.                                                                                                            |
| Page `/adherer`       | Marche à suivre PayPal uniquement : montant, adresse, note (nom, prénom, identifiants de jeu). Aucun paiement intégré.                                                  |
| Formule Découverte    | Carte d'information (`PlanKind.DISCOVERY`), jamais enregistrée comme adhésion.                                                                                          |
| Paiement              | Mode + montant + référence PayPal facultative (effacée à l'anonymisation).                                                                                              |
| Reçu fiscal           | Retiré.                                                                                                                                                                 |
| Stack                 | Next.js 16, Better Auth, Prisma 7 (adaptateur `pg`), Tailwind 4 pour l'admin, CSS d'origine pour le site.                                                               |
| Journal d'audit       | Immuable (trigger PostgreSQL), valeurs personnelles masquées, purge à 12 mois.                                                                                          |
| Conservation          | Inscriptions 12 mois ; messages non traités 12 mois ; fiche sans adhésion anonymisée 3 ans après création ; corbeille anonymisée à 30 jours.                            |
| Photos                | Publication libre par l'administrateur (seul à pouvoir ajouter des photos) ; accord des personnes vérifié hors site. Texte alternatif facultatif, repli sur la légende. |
| Verrouillage          | 5 échecs → 15 min ; 10 échecs → 1 h ; déblocage d'urgence en ligne de commande.                                                                                         |
| Accès à l'admin       | Administration sous `/timonerie` (dossier `src/app/timonerie`, API `src/app/api/timonerie`) ; `/admin` n'existe pas.                                                    |
| Mineurs               | Aucune information permettant de savoir qui est mineur (ni âge, ni case, ni scan) : tout se traite en personne, autorisations parentales sur papier.                    |

## 2. Arborescence

```
.
├── prisma/
│   ├── schema.prisma
│   ├── migrations/              # migration initiale + SQL manuel (CHECK, trigger du journal)
│   └── seed.ts                  # jeux, formules, événements, photos, FAQ, admin (+ démo)
├── prisma.config.ts
├── public/                      # logo, visuels de démonstration (demo/), image Open Graph
├── assets/fonts/                # polices des PDF (OFL)
├── scripts/                     # admin-reset, backup, restore, screenshots
├── src/
│   ├── proxy.ts                 # redirection vers /timonerie/connexion sans session
│   ├── app/
│   │   ├── (site)/              # site public (layout racine n° 1, site.css d'origine)
│   │   │   ├── page.tsx         # accueil
│   │   │   ├── evenements/      # agenda filtrable + [slug] (inscription, JSON-LD Event)
│   │   │   ├── inscription/annuler/[token]/
│   │   │   ├── adherer/  galerie/  mentions-legales/  confidentialite/
│   │   ├── timonerie/           # administration (layout racine n° 2, Tailwind)
│   │   │   ├── connexion/
│   │   │   └── (espace)/        # session vérifiée côté serveur
│   │   │       ├── adherents/ (liste, [id], nouveau, import, fusion)
│   │   │       ├── evenements/ (liste, [id], nouveau)
│   │   │       ├── galerie/  contenus/  messages/  documents/  journal/  registre/  compte/
│   │   ├── api/
│   │   │   ├── auth/[...all]/   # Better Auth
│   │   │   ├── cron/quotidien/  # tâches planifiées (CRON_SECRET)
│   │   │   └── timonerie/       # pdf/[document], export/[entite], fichiers/[id], photos
│   │   ├── uploads/[...path]/   # photos locales quand Blob n'est pas configuré
│   │   ├── global-not-found.tsx  sitemap.ts  robots.ts  icon.png
│   ├── components/
│   │   ├── site/                # nav, effets GSAP/Lenis, scène R3F, agenda, galerie, formulaires
│   │   └── admin/               # shell, formulaires, tableaux, éditeurs
│   ├── server/
│   │   ├── auth/                # Better Auth, argon2, verrouillage, garde des routes
│   │   ├── service/             # adminAction(), audit, erreurs, actions publiques
│   │   ├── domain/              # adhérents, adhésions, fusion, anonymisation, événements, inscriptions
│   │   ├── actions/             # Server Actions ('use server'), fines
│   │   ├── queries/             # lectures publiques (cache taggé) et admin
│   │   ├── cron/  mail/  pdf/   # tâches, e-mails React Email, documents @react-pdf
│   │   └── db.ts  env.ts  storage.ts  images.ts  rate-limit.ts  settings.ts  discord.ts
│   ├── lib/                     # partagé client/serveur : dates, formats, libellés, validation zod,
│   │                            # règles photo, alertes, registre, durées de conservation
│   └── generated/prisma/        # client généré (ignoré par git)
├── tests/
│   ├── unit/                    # Vitest
│   └── e2e/                     # Playwright (+ axe)
├── docker-compose.yml  vercel.json  .github/workflows/ (ci, sauvegarde)
```

## 3. Couche service et audit

Toute écriture de l'administration passe par `adminAction()` (`src/server/service/admin-action.ts`), qui enchaîne dans cet ordre :

1. vérification de la session côté serveur ;
2. validation zod (objet ou `FormData`) ;
3. exécution dans une transaction ;
4. écriture du journal dans la même transaction, par `AuditRecorder` (diff avant/après, champs personnels masqués) ;
5. `updateTag()` des contenus publics concernés ;
6. effets différés après validation (`afterCommit` : e-mails, webhook Discord).

Les Route Handlers (PDF, exports, fichiers privés, upload) vérifient la session et écrivent eux-mêmes leur ligne `PDF_GENERATED` ou `EXPORT`. ESLint interdit d'importer le client Prisma dans les pages, les composants et les actions.

## 4. Cache du site public

Les lectures publiques (`src/server/queries/public.ts`) utilisent `unstable_cache` avec des tags (`events`, `photos`, `settings`…) et une revalidation d'une heure. Les actions admin appellent `updateTag()` (lecture immédiate de ses propres écritures) ; le cron utilise `revalidateTag(tag, "max")`. Les pages publiques sont statiques (ISR), sauf l'agenda filtré.

## 5. Performance du site

- Intro du hero et écran de chargement en CSS (même chorégraphie que la timeline GSAP d'origine), joués dès la réception du HTML.
- Éléments `.reveal` visibles à l'ouverture : animés en CSS par un petit script inline. GSAP et Lenis s'initialisent au premier moment libre.
- Scène React Three Fiber : chargée à la première interaction (ou après 4 s sur ordinateur), jamais en rendu WebGL logiciel ni si l'utilisateur réduit les animations ; en pause hors écran.
- CSS inliné (`experimental.inlineCss`), images via `next/image`, polices `next/font`.
