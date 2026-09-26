import "server-only";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { formatDay } from "@/lib/format";
import type { Processing } from "@/lib/processing-register";
import { RETENTION } from "@/lib/retention";
import { base, C, LOGO_PATH } from "./theme";

function Header({ kicker, title }: { kicker: string; title: string }) {
  return (
    <View style={base.header}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={LOGO_PATH} style={base.logo} />
      <View>
        <Text style={base.kicker}>{kicker}</Text>
        <Text style={base.title}>{title}</Text>
      </View>
    </View>
  );
}

function Footer({ left }: { left: string }) {
  return (
    <View style={base.footer} fixed>
      <Text>{left}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function Check({ children }: { children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 9 }} wrap={false}>
      <View style={base.box} />
      <Text style={{ flex: 1 }}>{children}</Text>
    </View>
  );
}

function Fill({
  label,
  value,
  width,
}: {
  label: string;
  value?: string | null;
  width?: number | string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        marginBottom: 8,
        width: width ?? "100%",
      }}
    >
      <Text style={{ marginRight: 6 }}>{label}</Text>
      {value ? (
        <Text
          style={{
            fontWeight: 600,
            borderBottomWidth: 0.75,
            borderBottomColor: C.line,
            flexGrow: 1,
            paddingBottom: 1,
          }}
        >
          {value}
        </Text>
      ) : (
        <View style={base.line} />
      )}
    </View>
  );
}

// ── Autorisation parentale ─────────────────────────────────

export type ParentalConsentData = {
  associationName: string;
  associationAddress: string;
  contactEmail: string;
  child?: { firstName: string; lastName: string; birthYear: number | null } | null;
  date: string;
};

export function ParentalConsentPdf({
  associationName,
  associationAddress,
  contactEmail,
  child,
  date,
}: ParentalConsentData) {
  return (
    <Document title="Autorisation parentale" author={associationName} language="fr">
      <Page size="A4" style={base.page}>
        <Header kicker={associationName} title="Autorisation parentale" />
        <Text style={base.p}>
          Association {associationName}, {associationAddress}.
        </Text>

        <Text style={base.h2}>Le ou la responsable légal·e</Text>
        <Fill label="Je soussigné·e (nom, prénom) :" />
        <Fill label="Qualité (mère, père, tuteur·rice…) :" />

        <Text style={base.h2}>L&apos;enfant</Text>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <Fill label="Prénom :" value={child?.firstName} width="48%" />
          <Fill label="Nom :" value={child?.lastName} width="48%" />
        </View>
        <Fill
          label="Année de naissance :"
          value={child?.birthYear ? String(child.birthYear) : null}
          width="50%"
        />

        <Text style={base.h2}>Autorisations (cochez chaque ligne séparément)</Text>
        <Check>
          J&apos;autorise mon enfant à adhérer à l&apos;association et l&apos;enregistrement de ses
          nom, prénom, année de naissance et identifiants de jeu — nécessaire à toute inscription.
        </Check>
        <Check>
          J&apos;autorise la publication de photos de mon enfant dans la galerie du site de
          l&apos;association.
        </Check>
        <Check>
          J&apos;autorise la diffusion de photos de mon enfant sur les réseaux de l&apos;association
          (Discord, Instagram).
        </Check>
        <Text style={base.small}>
          Les deux dernières autorisations sont facultatives : les refuser n&apos;empêche pas
          l&apos;adhésion.
        </Text>

        <View style={{ flexDirection: "row", gap: 16, marginTop: 18 }}>
          <Fill label="Fait à :" width="48%" />
          <Fill label="Le :" value={date} width="48%" />
        </View>
        <Text style={{ marginTop: 4 }}>Signature du ou de la responsable légal·e :</Text>
        <View
          style={{
            height: 60,
            borderWidth: 0.75,
            borderColor: C.line,
            marginTop: 6,
            borderRadius: 4,
          }}
        />

        <View
          style={{ marginTop: 20, padding: 12, backgroundColor: "#F4F1EA", borderRadius: 6 }}
          wrap={false}
        >
          <Text style={{ fontFamily: "Josefin", fontWeight: 600, fontSize: 10, marginBottom: 4 }}>
            Vos données personnelles
          </Text>
          <Text style={base.small}>
            Finalité : gestion de l&apos;adhésion et, si vous l&apos;avez autorisé, publication de
            photos. Données conservées : nom, prénom, année de naissance, identifiants de jeu,
            périodes d&apos;adhésion, numéro de carte et vos choix ci-dessus. Aucune adresse, aucun
            téléphone, aucun e-mail n&apos;est enregistré.
            {` Durée : ${RETENTION.memberYears} ans après la dernière adhésion, puis anonymisation.`}{" "}
            Vous pouvez retirer chaque autorisation à tout moment, et exercer vos droits
            d&apos;accès, de rectification, d&apos;effacement et d&apos;opposition, en écrivant à{" "}
            {contactEmail}.
          </Text>
        </View>
        <Footer left={`${associationName} — autorisation parentale`} />
      </Page>
    </Document>
  );
}

// ── Carte de membre ────────────────────────────────────────

export type MemberCardData = {
  firstName: string;
  lastName: string;
  cardNumber: string | null;
  season: string;
  games: string[];
  associationName: string;
  contactEmail: string;
  size: "CR80" | "A6";
};

const MM = 72 / 25.4;

export function MemberCardPdf(d: MemberCardData) {
  const size: [number, number] = d.size === "CR80" ? [85.6 * MM, 54 * MM] : [148 * MM, 105 * MM];
  const k = d.size === "CR80" ? 1 : 1.7;
  const s = StyleSheet.create({
    recto: { backgroundColor: C.navy, color: C.ivory, padding: 12 * k, fontFamily: "SourceSans" },
    verso: { backgroundColor: C.ivory, color: C.ink, padding: 12 * k, fontFamily: "SourceSans" },
  });
  return (
    <Document
      title={`Carte de membre — ${d.firstName} ${d.lastName}`}
      author={d.associationName}
      language="fr"
    >
      <Page size={size} style={s.recto}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 * k }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={LOGO_PATH} style={{ width: 26 * k, height: 26 * k, borderRadius: 13 * k }} />
          <View>
            <Text
              style={{
                fontFamily: "Josefin",
                fontSize: 5.5 * k,
                letterSpacing: 1.4,
                color: C.rose,
                textTransform: "uppercase",
              }}
            >
              Carte de membre · {d.season}
            </Text>
            <Text
              style={{
                fontFamily: "Josefin",
                fontWeight: 300,
                fontSize: 9 * k,
                letterSpacing: 0.6,
              }}
            >
              L&apos;Ordre du Nautilus
            </Text>
          </View>
        </View>
        <View style={{ marginTop: "auto" }}>
          <Text style={{ fontFamily: "Josefin", fontWeight: 300, fontSize: 13 * k }}>
            {d.firstName}
          </Text>
          <Text
            style={{ fontFamily: "Josefin", fontWeight: 600, fontSize: 13 * k, letterSpacing: 0.5 }}
          >
            {d.lastName.toLocaleUpperCase("fr-FR")}
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 5 * k }}>
            <Text style={{ fontSize: 6 * k, color: C.brass }}>N° {d.cardNumber ?? "—"}</Text>
            <Text style={{ fontSize: 6 * k, color: "#B9C2CC" }}>Mobilis in mobili</Text>
          </View>
        </View>
      </Page>
      <Page size={size} style={s.verso}>
        <Text
          style={{
            fontFamily: "Josefin",
            fontSize: 5.5 * k,
            letterSpacing: 1.4,
            color: C.muted,
            textTransform: "uppercase",
          }}
        >
          Jeux pratiqués
        </Text>
        <Text style={{ fontFamily: "Josefin", fontSize: 8 * k, marginTop: 3 * k, color: C.navy }}>
          {d.games.length > 0 ? d.games.join(" · ") : "Tous les jeux de l'association"}
        </Text>
        <View style={{ marginTop: "auto" }}>
          <Text style={{ fontSize: 5.5 * k, color: C.muted, lineHeight: 1.4 }}>
            Carte personnelle, valable pour la saison {d.season}. À présenter lors des soirées et
            tournois.
          </Text>
          <Text style={{ fontSize: 5.5 * k, color: C.muted, marginTop: 2 * k }}>
            {d.contactEmail}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// ── Feuille d'émargement ───────────────────────────────────

export type AttendanceRow = {
  firstName: string;
  lastName: string;
  playerId: string | null;
  isMinor: boolean;
  status: string;
};

export type AttendanceData = {
  associationName: string;
  eventTitle: string;
  when: string;
  where: string;
  gameName: string | null;
  playerIdLabel: string | null;
  registered: AttendanceRow[];
  waitlisted: AttendanceRow[];
  blankRows: number;
};

const table = StyleSheet.create({
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.75,
    borderBottomColor: C.line,
    minHeight: 24,
    alignItems: "center",
  },
  head: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.navy,
    paddingBottom: 4,
    marginTop: 6,
  },
  th: { fontFamily: "Josefin", fontWeight: 600, fontSize: 8.5, color: C.navy },
  cell: { paddingHorizontal: 3, fontSize: 9.5 },
});

const COLS = { n: "5%", name: "30%", id: "22%", minor: "9%", present: "10%", sign: "24%" } as const;

function AttendanceTable({
  rows,
  blank,
  idLabel,
}: {
  rows: AttendanceRow[];
  blank: number;
  idLabel: string;
}) {
  const all = [...rows, ...Array.from({ length: blank }, () => null)];
  return (
    <View>
      <View style={table.head} fixed>
        <Text style={[table.th, table.cell, { width: COLS.n }]}>#</Text>
        <Text style={[table.th, table.cell, { width: COLS.name }]}>Nom et prénom</Text>
        <Text style={[table.th, table.cell, { width: COLS.id }]}>{idLabel}</Text>
        <Text style={[table.th, table.cell, { width: COLS.minor }]}>Mineur</Text>
        <Text style={[table.th, table.cell, { width: COLS.present }]}>Présent</Text>
        <Text style={[table.th, table.cell, { width: COLS.sign }]}>Signature</Text>
      </View>
      {all.map((r, i) => (
        <View key={i} style={table.row} wrap={false}>
          <Text style={[table.cell, { width: COLS.n, color: C.muted }]}>{i + 1}</Text>
          <Text style={[table.cell, { width: COLS.name }]}>
            {r ? `${r.lastName.toLocaleUpperCase("fr-FR")} ${r.firstName}` : ""}
          </Text>
          <Text style={[table.cell, { width: COLS.id, fontSize: 8.5 }]}>{r?.playerId ?? ""}</Text>
          <Text style={[table.cell, { width: COLS.minor }]}>{r?.isMinor ? "oui" : ""}</Text>
          <View style={[table.cell, { width: COLS.present }]}>
            <View style={[base.box, r?.status === "PRESENT" ? { backgroundColor: C.navy } : {}]} />
          </View>
          <View style={{ width: COLS.sign }} />
        </View>
      ))}
    </View>
  );
}

export function AttendanceSheetPdf(d: AttendanceData) {
  const idLabel = d.playerIdLabel ?? "Identifiant";
  return (
    <Document title={`Émargement — ${d.eventTitle}`} author={d.associationName} language="fr">
      <Page size="A4" style={base.page}>
        <Header
          kicker={`Feuille d'émargement${d.gameName ? ` · ${d.gameName}` : ""}`}
          title={d.eventTitle}
        />
        <Text style={base.p}>
          {d.when} — {d.where}
        </Text>
        <Text style={base.small}>
          {d.registered.length} inscrit(s)
          {d.waitlisted.length > 0 ? `, ${d.waitlisted.length} en liste d'attente` : ""}. Les moins
          de 16 ans doivent être accompagnés d&apos;un adulte.
        </Text>
        <AttendanceTable rows={d.registered} blank={d.blankRows} idLabel={idLabel} />
        {d.waitlisted.length > 0 ? (
          <View break={d.registered.length > 18}>
            <Text style={base.h2}>Liste d&apos;attente</Text>
            <AttendanceTable rows={d.waitlisted} blank={0} idLabel={idLabel} />
          </View>
        ) : null}
        <Footer left={`${d.associationName} — ${d.eventTitle}`} />
      </Page>
    </Document>
  );
}

// ── Registre des traitements ───────────────────────────────

export function ProcessingRegisterPdf({
  processings,
  associationName,
  controller,
  contactEmail,
  updatedAt,
}: {
  processings: Processing[];
  associationName: string;
  controller: string;
  contactEmail: string;
  updatedAt: Date;
}) {
  return (
    <Document title="Registre des activités de traitement" author={associationName} language="fr">
      <Page size="A4" style={base.page}>
        <Header kicker={associationName} title="Registre des activités de traitement" />
        <Text style={base.p}>
          Responsable du traitement : {associationName}, représentée par {controller}. Contact pour
          l&apos;exercice des droits : {contactEmail}. Document établi d&apos;après le modèle de la
          CNIL, mis à jour le {formatDay(updatedAt)}.
        </Text>
        {processings.map((p, i) => (
          <View
            key={p.name}
            wrap={false}
            style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 0.75, borderTopColor: C.line }}
          >
            <Text style={[base.h2, { marginTop: 0 }]}>
              {i + 1}. {p.name}
            </Text>
            {(
              [
                ["Finalité", p.purpose],
                ["Base légale", p.legalBasis],
                ["Personnes concernées", p.people],
                ["Données", p.data.join(" ; ")],
                ["Durée de conservation", p.retention],
                ["Destinataires", p.recipients],
                ["Mesures de sécurité", p.security],
              ] as const
            ).map(([label, value]) => (
              <View key={label} style={{ flexDirection: "row", marginBottom: 3 }}>
                <Text style={{ width: 120, fontWeight: 600, fontSize: 9.5 }}>{label}</Text>
                <Text style={{ flex: 1, fontSize: 9.5 }}>{value}</Text>
              </View>
            ))}
          </View>
        ))}
        <Footer left={`${associationName} — registre des traitements`} />
      </Page>
    </Document>
  );
}
