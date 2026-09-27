import { RETENTION } from "./retention";

/**
 * Registre des activités de traitement (art. 30 RGPD), d'après le modèle CNIL.
 * Source unique pour la page admin, l'export PDF et la page confidentialité.
 */
export type Processing = {
  name: string;
  purpose: string;
  legalBasis: string;
  people: string;
  data: string[];
  retention: string;
  recipients: string;
  security: string;
};

export const PROCESSINGS: Processing[] = [
  {
    name: "Gestion des adhérents",
    purpose:
      "Tenir la liste des membres, enregistrer les adhésions et leur renouvellement, remettre la carte de membre, gérer l'accès aux soirées réservées aux membres.",
    legalBasis: "Exécution du contrat d'adhésion (art. 6.1.b RGPD).",
    people: "Adhérents.",
    data: [
      "Nom, prénom",
      "Identifiants de joueur par jeu (Konami ID, Bandai TCG+ ID…)",
      "Périodes d'adhésion, formule, montant, mode de paiement, référence PayPal facultative",
      "Numéro de carte physique",
      "Notes internes courtes",
    ],
    retention: `${RETENTION.memberYears} ans après la fin de la dernière adhésion, puis anonymisation automatique. Les montants et dates restent, sans nom, pour la comptabilité.`,
    recipients:
      "Bureau de l'association (administrateur unique du site). Aucun transfert à des tiers.",
    security:
      "Accès par compte unique protégé (mot de passe argon2, double authentification), journal des actions, hébergement chiffré.",
  },
  {
    name: "Droit à l'image",
    purpose:
      "Enregistrer le consentement à la publication de photos (galerie du site, réseaux). Les autorisations parentales des mineurs sont signées sur papier, en personne, et conservées par l'association hors du site.",
    legalBasis:
      "Consentement (art. 6.1.a RGPD), recueilli par écrit auprès du responsable légal pour les mineurs.",
    people: "Adhérents et, pour les mineurs, leurs responsables légaux.",
    data: [
      "Autorisation galerie / réseaux : oui ou non, date, source (papier signé, oral, formulaire)",
    ],
    retention:
      "Jusqu'au retrait du consentement, et au plus tard jusqu'à l'anonymisation de la fiche.",
    recipients: "Bureau de l'association.",
    security:
      "Accès réservé à l'administrateur ; aucune information permettant d'identifier un mineur n'est enregistrée sur le site.",
  },
  {
    name: "Inscriptions aux événements",
    purpose:
      "Réserver une place à une soirée ou un tournoi, gérer la liste d'attente, pointer les présents.",
    legalBasis: "Mesures précontractuelles prises à la demande de la personne (art. 6.1.b RGPD).",
    people: "Participants aux événements (membres ou non).",
    data: [
      "Nom, prénom, identifiant de joueur",
      "E-mail facultatif, uniquement pour la confirmation et le lien d'annulation",
    ],
    retention: `E-mail effacé ${RETENTION.registrationEmailDays} jours après l'événement ; inscription supprimée ${RETENTION.registrationMonths} mois après l'événement.`,
    recipients:
      "Bureau de l'association ; prestataire d'envoi d'e-mails (Resend) pour la confirmation.",
    security: "Limitation du nombre de demandes, jeton d'annulation haché.",
  },
  {
    name: "Galerie photo",
    purpose: "Montrer la vie de l'association sur le site.",
    legalBasis: "Consentement des personnes identifiables (art. 6.1.a RGPD).",
    people: "Participants photographiés.",
    data: ["Photographies", "Lien interne entre une photo et les membres identifiés"],
    retention:
      "Jusqu'au retrait du consentement ou à la suppression de la photo ; dépublication automatique si l'autorisation est retirée.",
    recipients: "Public (photos publiées uniquement).",
    security:
      "Publication bloquée tant que les droits ne sont pas vérifiés ; métadonnées (dont géolocalisation) supprimées des fichiers.",
  },
  {
    name: "Formulaire de contact",
    purpose: "Répondre aux questions des visiteurs.",
    legalBasis: "Intérêt légitime de l'association à répondre aux demandes (art. 6.1.f RGPD).",
    people: "Visiteurs du site.",
    data: ["Prénom, e-mail, jeu qui intéresse, message"],
    retention: `${RETENTION.contactHandledMonths} mois après traitement ; ${RETENTION.contactUnhandledMonths} mois au plus si le message n'est jamais traité.`,
    recipients:
      "Bureau de l'association ; prestataire d'envoi d'e-mails (Resend) pour la notification.",
    security: "Limitation du nombre d'envois, champ anti-robot.",
  },
  {
    name: "Journal d'administration",
    purpose:
      "Tracer les actions de l'administrateur pour la sécurité et la preuve (qui a modifié quoi, quand).",
    legalBasis: "Intérêt légitime (sécurité du traitement, art. 6.1.f et 32 RGPD).",
    people: "Administrateur ; indirectement, les personnes concernées par les fiches modifiées.",
    data: [
      "Action, type et identifiant de l'élément, date",
      "Champs modifiés (valeurs personnelles masquées)",
      "Adresse IP et navigateur de l'administrateur",
    ],
    retention: `${RETENTION.auditMonths} mois.`,
    recipients: "Administrateur.",
    security: "Journal immuable (modifications refusées par la base de données).",
  },
];
