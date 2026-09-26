# L'Ordre du Nautilus

Site et administration de **L'Ordre du Nautilus**, association amiénoise de jeux de cartes à collectionner (Magic, Pokémon, Yu-Gi-Oh!, Lorcana, One Piece, Flesh and Blood).

- **Site public** : le site vitrine d'origine, à l'identique, mais alimenté par la base. On y trouve l'agenda filtrable, l'inscription aux événements sans compte, la page « Adhérer » (paiement PayPal hors site), la galerie, le contact et les pages légales.
- **Administration** (`/admin`) : un compte unique pour gérer adhérents, adhésions, événements, inscrits, galerie, contenus, documents PDF, messages et journal d'activité.
- **RGPD par construction** : l'association ne stocke d'un adhérent que le strict nécessaire. Anonymisation automatique au bout de 3 ans, journal d'audit immuable sans valeurs personnelles.

![Accueil](docs/captures/site-accueil.jpg)

---

## Sommaire

1. [Démarrage en local](#1-démarrage-en-local)
2. [Variables d'environnement](#2-variables-denvironnement)
3. [Commandes utiles](#3-commandes-utiles)
4. [Déploiement : Vercel, Neon, Resend, Blob](#4-déploiement--vercel-neon-resend-blob)
5. [Tâches planifiées](#5-tâches-planifiées)
6. [Sauvegarde et restauration](#6-sauvegarde-et-restauration)
7. [Guide d'utilisation de l'administration](#7-guide-dutilisation-de-ladministration)
8. [Checklist RGPD](#8-checklist-rgpd)
9. [Tests et qualité](#9-tests-et-qualité)
10. [Choix techniques et écarts avec le cahier des charges](#10-choix-techniques-et-écarts-avec-le-cahier-des-charges)

---

## 1. Démarrage en local

Prérequis : **Node.js 22 ou plus** et une base PostgreSQL (une branche Neon, ou Docker).

```bash
npm install                 # installe les dépendances et génère le client Prisma
cp .env.example .env        # puis compléter (voir section 2)
```

**Base de données** : au choix.

- **Branche Neon** (recommandé). Dans la console Neon, créez une branche `dev` et copiez ses deux URL dans `.env` :
  - `DATABASE_URL` : l'URL poolée (hôte en `-pooler`) ;
  - `DIRECT_URL` : l'URL directe.
- **Docker** :

  ```bash
  docker compose up -d
  ```

  Puis, dans `.env`, `DATABASE_URL` et `DIRECT_URL` valent `postgresql://nautilus:nautilus@localhost:5432/nautilus`.

```bash
npm run db:deploy                   # applique les migrations
SEED_DEMO=true npm run db:seed      # contenus de démonstration + adhérents fictifs
npm run dev                         # http://localhost:3001
```

L'administration est sur <http://localhost:3001/admin>. Identifiant : `ADMIN_EMAIL`, mot de passe : `ADMIN_INITIAL_PASSWORD` (tous deux dans `.env`). Changez ce mot de passe dès la première connexion (**Mon compte**).

> Le site tourne sur le port **3001** : le 3000 est souvent déjà pris par un autre projet.
>
> Sans `RESEND_API_KEY`, les e-mails sont affichés dans le terminal. Sans `BLOB_READ_WRITE_TOKEN`, les photos sont écrites dans `storage/uploads`.

## 2. Variables d'environnement

| Variable                                 | Obligatoire | Rôle                                                                                                                                    |
| ---------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                           | oui         | URL PostgreSQL **poolée** (Neon : hôte `-pooler`), utilisée par l'application                                                           |
| `DIRECT_URL`                             | oui         | URL **directe**, utilisée par les migrations et scripts. Sur Vercel avec l'intégration Neon, `DATABASE_URL_UNPOOLED` est aussi reconnue |
| `NEXT_PUBLIC_SITE_URL`                   | oui         | URL publique du site (liens des e-mails, sitemap, JSON-LD)                                                                              |
| `BETTER_AUTH_URL`                        | oui         | Même valeur que `NEXT_PUBLIC_SITE_URL`                                                                                                  |
| `BETTER_AUTH_SECRET`                     | oui         | Secret de session : `openssl rand -base64 32`                                                                                           |
| `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD` | au seed     | Compte administrateur créé par `npm run db:seed` (12 caractères minimum)                                                                |
| `ADMIN_NOTIFY_EMAIL`                     | conseillé   | Destinataire des alertes (à défaut : l'e-mail du compte admin)                                                                          |
| `RESEND_API_KEY` / `MAIL_FROM`           | en prod     | Envoi des e-mails (alertes admin, confirmations d'inscription)                                                                          |
| `BLOB_READ_WRITE_TOKEN`                  | en prod     | Stockage des photos sur Vercel Blob                                                                                                     |
| `CRON_SECRET`                            | en prod     | Protège `/api/cron/quotidien` : `openssl rand -hex 24`                                                                                  |
| `IP_HASH_SECRET`                         | en prod     | Clé de hachage des IP pour la limitation de débit : `openssl rand -hex 24`                                                              |
| `DISCORD_WEBHOOK_URL`                    | non         | Annonce des événements publiés (à activer aussi dans Réglages → Options)                                                                |

## 3. Commandes utiles

| Commande                                                | Effet                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`                                           | Serveur de développement (port 3001)                                           |
| `npm run build` / `npm start`                           | Build et serveur de production                                                 |
| `npm run typecheck` · `npm run lint` · `npm run format` | Qualité (TypeScript strict, ESLint, Prettier)                                  |
| `npm test`                                              | Tests unitaires (Vitest)                                                       |
| `npm run test:e2e`                                      | Parcours critiques (Playwright), à lancer sur une **base de test**             |
| `npm run db:migrate`                                    | Crée une migration après modification de `prisma/schema.prisma`                |
| `npm run db:deploy`                                     | Applique les migrations en attente                                             |
| `npm run db:seed`                                       | Données initiales (idempotent ; `SEED_DEMO=true` ajoute des adhérents fictifs) |
| `npm run db:studio`                                     | Explorateur de la base                                                         |
| `npm run admin:reset`                                   | Débloque le compte admin (voir [Dépannage](#dépannage))                        |
| `npm run screenshots`                                   | Régénère les captures de ce guide                                              |
| `./scripts/backup.sh` · `./scripts/restore.sh`          | Sauvegarde et restauration (voir section 6)                                    |

Un hook Husky lance ESLint et Prettier sur les fichiers modifiés à chaque commit.

## 4. Déploiement : Vercel, Neon, Resend, Blob

1. **Neon** : le projet existe déjà (`wild-smoke-59314577`).
   - Branche `production` : le site en ligne. Migrations et seed déjà appliqués ; le compte admin existe, avec un mot de passe transmis séparément.
   - Branche `dev` : le développement local et les tests.
2. **Vercel** : importez le dépôt GitHub.
   - Framework : Next.js. Rien d'autre à régler : le script `vercel-build` génère le client Prisma, applique les migrations (`prisma migrate deploy`) puis compile.
   - Renseignez les variables de la section 2 pour l'environnement _Production_.
   - Avec l'intégration Neon du Marketplace, `DATABASE_URL` et `DATABASE_URL_UNPOOLED` sont créées automatiquement.
   - Pour les _Preview_, pointez sur une branche Neon distincte, jamais sur la production.
3. **Vercel Blob** : Storage → Create → Blob, relié au projet. `BLOB_READ_WRITE_TOKEN` est ajoutée d'office.
4. **Resend** :
   - vérifiez le domaine d'envoi (enregistrements DNS SPF/DKIM) ;
   - créez une clé d'API → `RESEND_API_KEY` ;
   - `MAIL_FROM` = une adresse de ce domaine.
5. **Cron** : déjà déclaré dans `vercel.json`. Ajoutez simplement `CRON_SECRET` : Vercel l'envoie automatiquement dans l'en-tête `Authorization` (voir section 5).
6. **Domaine** : ajoutez `ordredunautilus.fr` dans Vercel, puis mettez à jour `NEXT_PUBLIC_SITE_URL` et `BETTER_AUTH_URL`.
7. Après le premier déploiement :
   - connectez-vous sur `/admin` et changez le mot de passe ;
   - activez la double authentification ;
   - complétez **Contenus → Réglages** : adresse, PayPal, RNA, présidence, hébergeur, réseaux.

## 5. Tâches planifiées

Une seule route, `GET /api/cron/quotidien`, protégée par `Authorization: Bearer $CRON_SECRET`. Vercel l'appelle chaque jour à `0 4 * * *` UTC, soit 06:00 à Paris l'été et 05:00 l'hiver (Vercel Cron ne gère pas les fuseaux). Sur l'offre Hobby, l'heure peut glisser de 59 minutes.

Chaque tâche est idempotente et tracée dans la table `CronRun`. Le tableau de bord alerte si rien n'a tourné depuis 36 h.

| Tâche          | Contenu                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `adhesions`    | Alertes à l'admin à J-30, J-7 et J0, une fois par palier (un palier manqué est rattrapé). Passage au statut « échu » le lendemain de la fin.                                                                                                                                                                                                                                              |
| `evenements`   | Événements passés → « terminé ». E-mails d'inscription effacés 7 jours après l'événement. Inscriptions supprimées au bout de 12 mois.                                                                                                                                                                                                                                                     |
| `conservation` | Messages traités supprimés après 6 mois (12 s'ils ne sont jamais traités). **Suppression automatique** des fiches dont la dernière adhésion a pris fin il y a plus de 3 ans, et des fiches en corbeille depuis 30 jours (même règle que le bouton : effacement complet sans adhésion, anonymisation sinon). Purge du journal (12 mois), des compteurs anti-abus et des sessions expirées. |
| `digest`       | E-mail récapitulatif à l'admin : adhésions à renouveler ce mois-ci, inscriptions de la veille, messages en attente.                                                                                                                                                                                                                                                                       |

Déclenchement manuel :

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://ordredunautilus.fr/api/cron/quotidien
```

Notifications immédiates, sans attendre le cron : nouveau message de contact, inscription sur un événement complet, place libérée alors qu'il y a une liste d'attente.

## 6. Sauvegarde et restauration

Trois niveaux, du plus simple au plus complet :

1. **Historique Neon** (restauration à un instant donné). Console Neon → Branches → _Restore_. La durée d'historique dépend de l'offre (quelques heures en gratuit, jusqu'à 30 jours en payant). Avant une opération risquée, créez une branche : c'est un instantané gratuit.
2. **Sauvegarde quotidienne automatique**, via le workflow GitHub `.github/workflows/sauvegarde.yml` :
   - un `pg_dump` chaque nuit, chiffré en AES-256, conservé 30 jours comme artefact ;
   - à activer en ajoutant deux secrets GitHub : `BACKUP_DATABASE_URL` (URL directe de la production) et `BACKUP_PASSPHRASE` ;
   - la phrase de passe est à conserver aussi hors de GitHub (coffre du bureau).
3. **Sauvegarde manuelle**, depuis un poste qui a les outils PostgreSQL (`brew install libpq && brew link --force libpq`) :

   ```bash
   ./scripts/backup.sh                                   # → backups/nautilus-AAAAMMJJ-HHMM.dump
   ```

**Restaurer** (de préférence dans une nouvelle branche Neon, puis basculer `DATABASE_URL`) :

```bash
gpg --decrypt nautilus-20261001-0330.dump.gpg > nautilus.dump   # si la sauvegarde vient de GitHub
./scripts/restore.sh nautilus.dump "postgresql://…url-directe-de-la-cible…"
```

Les sauvegardes contiennent des données personnelles : stockez-les chiffrées et supprimez celles de plus de 12 mois.

## 7. Guide d'utilisation de l'administration

### Connexion et sécurité

<img src="docs/captures/admin-connexion.jpg" alt="Page de connexion" width="600">

- Un seul compte, qui a tous les droits. Après **5 échecs**, le compte est verrouillé 15 minutes (1 heure à partir de 10 échecs).
- **Mon compte** : changer le mot de passe (les autres sessions sont alors fermées), activer la **double authentification** et voir ou révoquer les sessions ouvertes.
  - Scannez le QR code avec Aegis, 2FAS ou Google Authenticator.
  - **Imprimez les codes de secours** et rangez-les avec les documents de l'association.
- Raccourcis clavier : <kbd>/</kbd> place le curseur dans la recherche, <kbd>n</kbd> crée un élément (adhérent, événement).

### Tableau de bord

![Tableau de bord](docs/captures/admin-tableau-de-bord.jpg)

On y trouve :

- les adhésions qui expirent sous 30 jours, et celles échues depuis moins de 3 mois sans renouvellement ;
- les inscriptions du jour et le remplissage des prochains événements ;
- les messages non traités ;
- les mineurs à vérifier : autorisation parentale manquante, case « mineur » à revoir ;
- les dernières actions du journal.

### Adhérents

![Liste des adhérents](docs/captures/admin-adherents.jpg)

**Quelqu'un a payé par PayPal** :

1. Retrouvez la personne avec la recherche (nom, carte ou identifiant de jeu), ou créez sa fiche : **Nouvel adhérent**.
2. Sur la fiche, ouvrez **Enregistrer une adhésion** et remplissez :
   - la formule ;
   - la date de début (aujourd'hui par défaut ; la fin est calculée) ;
   - le mode de paiement et, si vous voulez, la référence PayPal ;
   - le numéro de carte.
3. Cochez **Carte remise en main propre** quand vous la donnez, ou cliquez plus tard sur « Marquer la carte remise ».
4. Imprimez la carte : bouton **Carte de membre (CR80)** ou **A6**.

**Modifier une fiche** : bouton **Modifier** dans « Paramètres de l'adhérent », en haut de la fiche, ou icône crayon dans la liste. Tous les paramètres se modifient au même endroit : identité, année de naissance, case mineur, numéro de carte, suspension, notes, identifiants de jeu, autorisations photo et parentale. **Enregistrer les modifications** revient au récapitulatif ; **Annuler** abandonne les changements. Contrôles appliqués à l'enregistrement :

- le **statut** actif ou échu est calculé d'après les adhésions ; seule la case « Adhérent suspendu » se règle à la main ;
- le **numéro de carte** doit être unique : le message indique à qui il est déjà attribué ;
- chaque **identifiant de jeu** doit respecter le format de son jeu et ne pas appartenir à une autre fiche ;
- si une **autorisation photo** est retirée (ou si la fiche passe en mineur sans papier signé), les photos où la personne est identifiée sont retirées de la galerie, et un message le signale.

**Corriger une adhésion** : icône crayon sur la ligne de l'adhésion. On peut modifier la formule, le début, la fin (avec un lien pour la recalculer d'après la formule), le montant, le mode de paiement et la référence. Les dates ne doivent pas chevaucher une autre adhésion du membre. Si la fin change, les alertes d'échéance repartent de zéro et le statut est recalculé. L'icône poubelle supprime une adhésion saisie par erreur.

**Renouveler** : la nouvelle adhésion est chaînée à la précédente. Si l'ancienne n'est pas terminée, la nouvelle commence le lendemain de sa fin : ni trou, ni chevauchement.

![Fiche adhérent](docs/captures/admin-fiche-adherent.jpg)

**Adhérent mineur** :

1. Cochez « Mineur ».
2. Imprimez l'**autorisation parentale pré-remplie** et faites-la signer.
3. Cochez les cases miroir sur la fiche (autorisation reçue, galerie, réseaux, avec la source « papier signé »).
4. Joignez le scan, facultatif. Il est stocké en base et n'est jamais accessible par une adresse publique.

Ce sont ces cases qui autorisent ou bloquent la publication de photos. Chaque saison, confirmez la case « mineur » ; le tableau de bord signale les fiches à revoir.

**Import CSV** : associez chaque colonne à un champ autorisé. Les colonnes e-mail, téléphone ou adresse ne peuvent pas être importées.

**Doublons** : la page **Fusionner des doublons** repère les fiches au même nom. Tout (adhésions, inscriptions, identifiants, autorisations) passe sur la fiche conservée.

**Supprimer une fiche** : icône poubelle au bout de chaque ligne de la liste, ou en haut à droite de la fiche. Pour en supprimer plusieurs d'un coup, cochez-les dans la liste, puis **Supprimer la sélection**. Ce qui est effacé dépend de la fiche :

- **Fiche sans aucune adhésion** (erreur de saisie, doublon, test) : effacée entièrement de la base.
- **Fiche avec des adhésions** : nom, identifiants de jeu, autorisations et documents sont effacés ; les montants et dates restent en comptabilité sous « Ancien membre ». C'est aussi la réponse à une demande d'effacement RGPD.

Dans les deux cas, les photos où la personne était identifiée repassent en brouillon, et la suppression est tracée dans le journal.

**Corbeille** (en bas de la fiche) : pour mettre une fiche de côté sans la supprimer tout de suite. Elle disparaît des listes (filtre « Corbeille » pour la retrouver), reste restaurable, puis est supprimée automatiquement après 30 jours.

### Événements

![Gestion des inscrits](docs/captures/admin-inscrits.jpg)

**Créer un événement** : type, jeu, date, horaires, capacité et prix. Enregistrez-le d'abord en **brouillon**, puis **Publier**. Les soirées « libre » n'ont pas d'inscription.

**Gérer les inscrits** :

- **Pointage** : boutons Présent et Absent.
- **Liste d'attente** : elle suit l'ordre d'arrivée. Utilisez **Promouvoir** quand une place se libère ; la personne est prévenue si elle a laissé un e-mail.
- **Ajout à la main** : pour les inscriptions reçues autrement que par le site.
- **Rapprochement** : relie une inscription à une fiche adhérent.

**Imprimer** : **Feuille d'émargement** (PDF), ou export CSV des inscrits.

**Autres actions** :

- **Dupliquer** : copie en brouillon, une semaine plus tard.
- **Annuler l'événement** : les inscrits qui ont laissé un e-mail sont prévenus.

### Galerie

![Galerie](docs/captures/admin-galerie.jpg)

1. Glissez-déposez les photos. Elles arrivent en brouillon, redimensionnées, sans métadonnées (géolocalisation comprise).
2. **Modifier** chaque photo :
   - texte alternatif (obligatoire) et légende ;
   - soirée de rattachement ;
   - membres identifiables sur la photo ;
   - case **Droits à l'image vérifiés**.
3. **Publier**. La publication reste bloquée tant que la case n'est pas cochée ou qu'un membre identifié n'a pas donné son accord. Pour un mineur, il faut un papier signé.

Si un membre retire son accord, ses photos sont dépubliées automatiquement. Glissez les vignettes pour changer l'ordre.

### Contenus et réglages

![Réglages](docs/captures/admin-reglages.jpg)

- **Témoignages**, **FAQ** (markdown accepté), **Formules** (prix, tarif réduit, avantages, mise en avant) et **Jeux** (libellé et format de l'identifiant éditeur).
- **Réglages** :
  - horaires, adresse, adresse PayPal ;
  - chiffres clés (« membres actifs » peut être calculé automatiquement) ;
  - réseaux, mentions légales, texte complémentaire de la page confidentialité ;
  - annonce Discord.
- Chaque enregistrement met le site à jour immédiatement.

### Messages

Boîte de réception du formulaire de contact : **Répondre par e-mail** ouvre votre messagerie avec un message pré-rempli ; marquez ensuite le message comme traité.

### Documents

![Documents](docs/captures/admin-documents.jpg)

Autorisation parentale (vierge ou pré-remplie), carte de membre, feuille d'émargement et registre des traitements, en PDF.

### Journal d'activité

![Journal](docs/captures/admin-journal.jpg)

Toutes les écritures (créations, modifications, suppressions, connexions, exports, PDF, anonymisations) avec le détail avant/après. Les valeurs personnelles apparaissent comme « [masqué] ». Filtres par élément, action et période ; export CSV. Le journal ne peut être ni modifié ni vidé (protection au niveau de la base).

### Dépannage

- **Compte verrouillé** : attendez 15 minutes, ou lancez `npm run admin:reset` depuis un poste qui a accès à la base.
- **Mot de passe oublié** : `npm run admin:reset -- --generate`.
- **Application d'authentification perdue** : utilisez un code de secours, ou `npm run admin:reset -- --disable-2fa`.

Chaque réinitialisation ferme toutes les sessions et est tracée dans le journal.

## 8. Checklist RGPD

**Mise en route**

- [ ] Compléter **Réglages → Mentions légales** : RNA, siège, présidence (responsable de traitement), hébergeur.
- [ ] Relire le **Registre des traitements** (`/admin/registre`) en bureau, le compléter si l'association tient d'autres fichiers (papier, tableur, groupe de discussion), l'exporter en PDF et le dater.
- [ ] Vérifier les contrats de sous-traitance (DPA) :
  - Vercel (hébergement, États-Unis, Data Privacy Framework) ;
  - Neon (base de données, région Francfort) ;
  - Resend (e-mails).
- [ ] Changer le mot de passe initial, activer la double authentification, imprimer les codes de secours.
- [ ] Activer la sauvegarde quotidienne (section 6) et noter où est rangée la phrase de passe.

**Information des personnes**

- [ ] La page **Confidentialité** (générée automatiquement) est liée en pied de page et depuis « Adhérer ».
- [ ] Lors de l'adhésion en personne, mentionner la page confidentialité ; pour un mineur, l'encart RGPD de l'autorisation parentale suffit.
- [ ] Le formulaire d'inscription précise que l'e-mail est facultatif et effacé après la soirée.

**Demande d'accès (art. 15) ou de portabilité (art. 20)**

1. Vérifier l'identité du demandeur (en personne, ou via un échange sur un canal déjà connu).
2. Fiche de l'adhérent → **Exporter ses données** : un fichier JSON avec identité, identifiants, adhésions, autorisations et inscriptions.
3. Le transmettre dans un délai d'**un mois**. L'export est tracé dans le journal.

**Demande de rectification** : modifier la fiche. C'est tracé.

**Demande d'effacement (art. 17) ou d'opposition** :

1. Fiche → icône poubelle (en haut à droite). L'effacement est immédiat : identité, identifiants, scan et inscriptions liées ; les photos où la personne était identifiée sont dépubliées. Si la personne a eu des adhésions, seuls les montants et dates restent, sans nom, pour la comptabilité.
2. Supprimer aussi, si besoin, la photo de la galerie et les éventuelles copies hors site (Discord, sauvegardes locales).
3. Répondre à la personne dans un délai d'un mois.

**Retrait du consentement aux photos** : décocher l'autorisation sur la fiche. Les photos concernées sont dépubliées automatiquement ; retirer aussi celles publiées sur les réseaux.

**Violation de données** (perte d'un ordinateur, accès non autorisé…) : noter les faits. Notifier la CNIL sous **72 heures** si un risque existe pour les personnes, et les prévenir si le risque est élevé.

**Durées de conservation**

| Donnée                             | Durée                                                            |
| ---------------------------------- | ---------------------------------------------------------------- |
| Fiche adhérent                     | 3 ans après la dernière adhésion, puis anonymisation automatique |
| Autorisations photo, scan parental | Jusqu'au retrait, au plus tard avec l'anonymisation              |
| Inscriptions                       | E-mail : 7 jours après l'événement ; le reste : 12 mois          |
| Messages de contact                | 6 mois après traitement (12 mois s'ils ne sont jamais traités)   |
| Journal d'administration           | 12 mois                                                          |
| Compteurs anti-abus (IP hachée)    | 24 heures                                                        |

## 9. Tests et qualité

- **Unitaires** (`npm test`, 46 tests), qui couvrent :
  - dates en heure de Paris, fin et renouvellement d'adhésion ;
  - paliers d'alerte, verrouillage ;
  - règles de publication photo, masquage du journal ;
  - validation des formulaires.
- **Parcours critiques** (`npm run test:e2e`, 20 tests Playwright), qui couvrent :
  - connexion ;
  - adhérent de bout en bout (adhésion, renouvellement, carte, anonymisation) ;
  - suppression de fiches depuis la liste, une par une et par sélection ;
  - modification d'une fiche (suspension, numéro de carte en doublon) et correction d'une adhésion ;
  - événement avec inscriptions publiques, liste d'attente, anti-doublon, promotion et émargement ;
  - galerie (publication bloquée puis autorisée) ;
  - cron protégé, routes admin refusées sans session ;
  - formulaire de contact ;
  - **accessibilité WCAG AA** (axe) sur les pages principales.

  Ces tests écrivent en base : lancez-les sur la branche Neon `dev` (ou une branche dédiée), jamais sur la production.

- **Lighthouse**, mesuré sur le build de production :

  |                           | Performance | Accessibilité | Bonnes pratiques | SEO |
  | ------------------------- | ----------- | ------------- | ---------------- | --- |
  | Ordinateur, toutes pages  | 98–100      | 100           | 100              | 100 |
  | Mobile, pages intérieures | 90–94       | 100           | 100              | 100 |
  | Mobile, accueil           | 87–89       | 100           | 100              | 100 |

- **CI GitHub** (`.github/workflows/ci.yml`) : typage, lint et tests unitaires sur chaque PR.

## 10. Choix techniques et écarts avec le cahier des charges

| Sujet                        | Choix                                                                                     | Pourquoi                                                                                                                                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js                      | **16** (au lieu de 15)                                                                    | Version courante au démarrage du projet ; `proxy.ts` remplace `middleware.ts`, `updateTag` pour l'invalidation immédiate.                                                                                                    |
| Authentification             | **Better Auth** (au lieu d'Auth.js v5)                                                    | Auth.js v5 n'est jamais sorti de bêta et ne gère pas « identifiant + mot de passe » avec sessions en base. Better Auth le fait nativement, avec 2FA TOTP et codes de secours ; argon2id et verrouillage branchés par-dessus. |
| Classement et résultats      | **Supprimés**                                                                             | Gérés dans les logiciels officiels des éditeurs (décision du 26/09/2026).                                                                                                                                                    |
| Formule Découverte           | Carte d'information seule                                                                 | Ne crée jamais d'adhésion ; renvoie vers les soirées découverte.                                                                                                                                                             |
| Reçu fiscal                  | Retiré de la formule Soutien                                                              | Décision de l'association.                                                                                                                                                                                                   |
| Scans parentaux              | Stockés en base (`PrivateFile`)                                                           | Privés par construction, sauvegardés avec la base, supprimés avec la fiche. Aucune URL publique possible.                                                                                                                    |
| Journal d'audit              | Valeurs personnelles masquées, purge à 12 mois                                            | Sinon une fiche anonymisée resterait lisible dans un journal immuable.                                                                                                                                                       |
| Contraste                    | `--ivory-3` passé de 48 % à 56 % d'opacité                                                | Les petits textes secondaires atteignent 5,6:1 (AA) au lieu de 4,4:1.                                                                                                                                                        |
| Intro du hero                | Chorégraphie reproduite en CSS                                                            | Mêmes durées et courbes que la timeline GSAP d'origine, sans attendre le JavaScript (meilleur LCP). GSAP garde les animations au défilement.                                                                                 |
| Scène 3D (React Three Fiber) | Chargée à la première interaction (ou après 4 s sur ordinateur), jamais en rendu logiciel | three.js pèse environ 250 Ko compressés ; le charger d'emblée faisait tomber la note mobile sous 40.                                                                                                                         |
| Limitation de débit          | En base (IP hachée)                                                                       | Fonctionne en serverless sans service supplémentaire.                                                                                                                                                                        |

L'arborescence et le détail des décisions sont dans [docs/architecture.md](docs/architecture.md) ; le site vitrine d'origine est conservé dans [docs/reference/site-vitrine.html](docs/reference/site-vitrine.html).
