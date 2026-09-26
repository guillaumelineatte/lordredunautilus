import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "react-email";

const colors = {
  navy: "#132438",
  ivory: "#F3EFE7",
  rose: "#DDA5A7",
  muted: "#5B6B7C",
};

const font = "'Source Sans 3', 'Helvetica Neue', Arial, sans-serif";
const headFont = "'Josefin Sans', 'Helvetica Neue', Arial, sans-serif";

function Layout({
  preview,
  title,
  children,
}: {
  preview: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{ backgroundColor: colors.ivory, fontFamily: font, color: colors.navy, margin: 0 }}
      >
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
          <Text
            style={{
              fontFamily: headFont,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontSize: 12,
              color: colors.muted,
              margin: 0,
            }}
          >
            L&apos;Ordre du Nautilus
          </Text>
          <Heading
            as="h1"
            style={{ fontFamily: headFont, fontWeight: 300, fontSize: 26, margin: "12px 0 20px" }}
          >
            {title}
          </Heading>
          {children}
          <Hr style={{ borderColor: "#D9D2C5", margin: "32px 0 16px" }} />
          <Text style={{ fontSize: 12, color: colors.muted, margin: 0 }}>
            Association de jeux de cartes à collectionner, Amiens.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export type AdminEmailProps = {
  title: string;
  intro?: string;
  sections?: { heading: string; items: string[]; empty?: string }[];
  cta?: { label: string; href: string };
};

/** Gabarit unique des e-mails envoyés à l'administrateur. */
export function AdminEmail({ title, intro, sections = [], cta }: AdminEmailProps) {
  return (
    <Layout preview={intro ?? title} title={title}>
      {intro ? <Text style={{ fontSize: 16, lineHeight: "24px" }}>{intro}</Text> : null}
      {sections.map((s) => (
        <Section key={s.heading} style={{ marginTop: 20 }}>
          <Text style={{ fontFamily: headFont, fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>
            {s.heading}
          </Text>
          {s.items.length === 0 ? (
            <Text style={{ fontSize: 14, color: colors.muted, margin: 0 }}>
              {s.empty ?? "Rien à signaler."}
            </Text>
          ) : (
            s.items.map((item, i) => (
              <Text key={i} style={{ fontSize: 14, lineHeight: "20px", margin: "0 0 4px" }}>
                • {item}
              </Text>
            ))
          )}
        </Section>
      ))}
      {cta ? (
        <Button
          href={cta.href}
          style={{
            display: "inline-block",
            marginTop: 28,
            backgroundColor: colors.navy,
            color: colors.ivory,
            padding: "12px 22px",
            borderRadius: 999,
            fontFamily: headFont,
            fontSize: 14,
            letterSpacing: "0.06em",
            textDecoration: "none",
          }}
        >
          {cta.label}
        </Button>
      ) : null}
    </Layout>
  );
}

export type RegistrationEmailProps = {
  firstName: string;
  eventTitle: string;
  when: string;
  where: string;
  status: "REGISTERED" | "WAITLISTED" | "PROMOTED" | "CANCELLED_BY_EVENT";
  cancelUrl?: string;
  isMinor?: boolean;
};

/** E-mail au participant (seulement s'il a laissé une adresse, effacée ensuite). */
export function RegistrationEmail({
  firstName,
  eventTitle,
  when,
  where,
  status,
  cancelUrl,
  isMinor,
}: RegistrationEmailProps) {
  const title =
    status === "WAITLISTED"
      ? "Vous êtes sur liste d'attente"
      : status === "PROMOTED"
        ? "Une place s'est libérée pour vous"
        : status === "CANCELLED_BY_EVENT"
          ? "Événement annulé"
          : "Votre place est réservée";
  const intro =
    status === "WAITLISTED"
      ? `Bonjour ${firstName}, l'événement « ${eventTitle} » est complet. Vous êtes sur liste d'attente : si une place se libère, l'équipe vous préviendra.`
      : status === "PROMOTED"
        ? `Bonjour ${firstName}, bonne nouvelle : une place s'est libérée et vous êtes maintenant inscrit·e à « ${eventTitle} ».`
        : status === "CANCELLED_BY_EVENT"
          ? `Bonjour ${firstName}, l'événement « ${eventTitle} » est malheureusement annulé. Toutes nos excuses.`
          : `Bonjour ${firstName}, votre inscription à « ${eventTitle} » est bien enregistrée.`;
  return (
    <Layout preview={intro} title={title}>
      <Text style={{ fontSize: 16, lineHeight: "24px" }}>{intro}</Text>
      {status !== "CANCELLED_BY_EVENT" ? (
        <Section style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: "16px 20px" }}>
          <Text style={{ margin: 0, fontSize: 15 }}>
            <strong>Quand :</strong> {when}
          </Text>
          <Text style={{ margin: "6px 0 0", fontSize: 15 }}>
            <strong>Où :</strong> {where}
          </Text>
        </Section>
      ) : null}
      {isMinor ? (
        <Text style={{ fontSize: 14, lineHeight: "20px" }}>
          Rappel : les moins de 16 ans doivent être accompagnés d&apos;un adulte pendant toute la
          soirée.
        </Text>
      ) : null}
      {cancelUrl ? (
        <Text style={{ fontSize: 14, lineHeight: "20px" }}>
          Un empêchement ? Libérez votre place pour quelqu&apos;un d&apos;autre :{" "}
          <a href={cancelUrl} style={{ color: colors.navy }}>
            annuler mon inscription
          </a>
          .
        </Text>
      ) : null}
      <Text style={{ fontSize: 12, color: colors.muted, lineHeight: "18px" }}>
        Votre adresse e-mail ne sert qu&apos;à cette confirmation. Elle est effacée automatiquement
        7 jours après l&apos;événement.
      </Text>
    </Layout>
  );
}
