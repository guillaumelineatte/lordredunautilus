import type {
  AuditAction,
  ConsentSource,
  ContactStatus,
  EventStatus,
  EventType,
  MemberStatus,
  PaymentMethod,
  RegistrationSource,
  RegistrationStatus,
} from "@/generated/prisma/enums";

export const memberStatusLabel: Record<MemberStatus, string> = {
  ACTIVE: "Actif",
  EXPIRED: "Échu",
  SUSPENDED: "Suspendu",
};

export const consentSourceLabel: Record<ConsentSource, string> = {
  SIGNED_PAPER: "Papier signé",
  VERBAL: "Oral",
  FORM: "Formulaire",
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  PAYPAL: "PayPal",
  CASH: "Espèces",
  BANK_TRANSFER: "Virement",
};

export const eventTypeLabel: Record<EventType, string> = {
  DISCOVERY: "découverte",
  OPEN_PLAY: "libre",
  DRAFT: "draft",
  TOURNAMENT: "tournoi",
};

export const eventTypeSlug: Record<EventType, string> = {
  DISCOVERY: "decouverte",
  OPEN_PLAY: "libre",
  DRAFT: "draft",
  TOURNAMENT: "tournoi",
};

export const eventStatusLabel: Record<EventStatus, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
  CANCELLED: "Annulé",
  COMPLETED: "Terminé",
};

export const registrationStatusLabel: Record<RegistrationStatus, string> = {
  REGISTERED: "Inscrit",
  WAITLISTED: "Liste d'attente",
  PRESENT: "Présent",
  ABSENT: "Absent",
  CANCELLED: "Annulé",
};

export const registrationSourceLabel: Record<RegistrationSource, string> = {
  PUBLIC: "Site",
  ADMIN: "Admin",
};

export const contactStatusLabel: Record<ContactStatus, string> = {
  NEW: "Nouveau",
  HANDLED: "Traité",
};

export const auditActionLabel: Record<AuditAction, string> = {
  CREATE: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
  LOGIN: "Connexion",
  LOGIN_FAILED: "Connexion échouée",
  EXPORT: "Export",
  PDF_GENERATED: "PDF généré",
  ANONYMIZE: "Anonymisation",
};

export const entityLabel: Record<string, string> = {
  Member: "Adhérent",
  MemberGameId: "Identifiant de jeu",
  Membership: "Adhésion",
  MembershipPlan: "Formule",
  Event: "Événement",
  EventRegistration: "Inscription",
  Photo: "Photo",
  Testimonial: "Témoignage",
  FaqItem: "FAQ",
  SiteSetting: "Réglage",
  ContactMessage: "Message",
  Game: "Jeu",
  AdminUser: "Compte admin",
  Document: "Document",
  System: "Système",
};
