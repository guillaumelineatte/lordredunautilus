import type { Metadata } from "next";
import type { ConsentSource } from "@/generated/prisma/enums";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/action-button";
import { TrashIcon } from "@/components/admin/icons";
import { MemberSheet } from "@/components/admin/member-sheet";
import { MembershipsTable } from "@/components/admin/memberships-table";
import {
  ParentalUploadForm,
  RecordMembershipForm,
  RenewMembershipForm,
} from "@/components/admin/membership-forms";
import {
  Badge,
  Card,
  DefinitionList,
  EmptyState,
  LinkButton,
  PageHeader,
} from "@/components/admin/ui";
import { addDays, dbDateToDay, parisDay, todayParis } from "@/lib/dates";
import { formatBytes, formatDateTime, formatDay, formatMoney } from "@/lib/format";
import {
  auditActionLabel,
  consentSourceLabel,
  memberStatusLabel,
  registrationStatusLabel,
} from "@/lib/labels";
import { deleteConfirmation } from "@/lib/member-deletion";
import {
  deleteMemberAction,
  markMinorReviewed,
  removeParentalDocument,
  restoreMember,
  trashMember,
} from "@/server/actions/members";
import { gameOptions, getMemberDetail, planOptions } from "@/server/queries/admin";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getMemberDetail(id);
  return { title: data ? `${data.member.firstName} ${data.member.lastName}` : "Adhérent" };
}

const dayOrNull = (d: Date | null) => (d ? dbDateToDay(d) : null);

function consent(granted: boolean, source: ConsentSource | null, at: Date | null): string {
  if (!granted) return "Non";
  return `Oui${source ? ` · ${consentSourceLabel[source].toLowerCase()}` : ""}${at ? ` · le ${formatDay(at)}` : ""}`;
}

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const startEditing = (await searchParams).modifier === "1";
  const [data, games, plans] = await Promise.all([
    getMemberDetail(id),
    gameOptions(true),
    planOptions(),
  ]);
  if (!data) notFound();
  const { member, history } = data;
  const today = todayParis();
  const membershipPlans = plans.filter((p) => p.kind === "MEMBERSHIP" && p.isActive);
  const latest = member.memberships.find((m) => !m.renewedBy);
  const anonymized = Boolean(member.anonymizedAt);

  if (anonymized) {
    return (
      <>
        <PageHeader
          back={{ href: "/timonerie/adherents", label: "Adhérents" }}
          kicker="Adhérents"
          title="Ancien membre"
          description={`Fiche anonymisée le ${formatDateTime(member.anonymizedAt)}.`}
        />
        <Card title="Adhésions conservées pour la comptabilité">
          <ul className="text-sm text-ivory-2">
            {member.memberships.map((m) => (
              <li key={m.id}>
                {m.plan.name} — {formatDay(m.startDate)} → {formatDay(m.endDate)} —{" "}
                {formatMoney(m.amountCents)}
              </li>
            ))}
          </ul>
        </Card>
      </>
    );
  }

  const fullName = `${member.firstName} ${member.lastName}`;
  // Aucun âge conservé : la case « mineur » se revérifie en personne chaque saison.
  const minorNeedsReview =
    member.isMinor &&
    (!member.minorReviewedAt || parisDay(member.minorReviewedAt) < addDays(today, -365));

  return (
    <>
      <PageHeader
        back={{ href: "/timonerie/adherents", label: "Adhérents" }}
        kicker="Adhérent"
        title={`${member.firstName} ${member.lastName}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge
              tone={
                member.status === "ACTIVE" ? "ok" : member.status === "EXPIRED" ? "warn" : "danger"
              }
            >
              {memberStatusLabel[member.status]}
            </Badge>
            {member.isMinor ? <Badge tone="rose">mineur</Badge> : null}
            {member.deletedAt ? (
              <Badge tone="danger">dans la corbeille depuis le {formatDay(member.deletedAt)}</Badge>
            ) : null}
            {member.cardNumber ? (
              <span className="font-mono text-xs">Carte {member.cardNumber}</span>
            ) : null}
          </span>
        }
        actions={
          <>
            <LinkButton
              href={`/api/timonerie/pdf/carte?adherent=${member.id}`}
              prefetch={false}
              size="sm"
            >
              Carte de membre (CR80)
            </LinkButton>
            <LinkButton
              href={`/api/timonerie/pdf/carte?adherent=${member.id}&format=a6`}
              prefetch={false}
              size="sm"
            >
              Carte A6
            </LinkButton>
            <LinkButton
              href={`/api/timonerie/export/fiche?adherent=${member.id}`}
              prefetch={false}
              size="sm"
              title="Droit d'accès et portabilité (RGPD)"
            >
              Exporter ses données
            </LinkButton>
            {member.isMinor ? (
              <LinkButton
                href={`/api/timonerie/pdf/autorisation-parentale?adherent=${member.id}`}
                prefetch={false}
                size="sm"
              >
                Autorisation parentale pré-remplie
              </LinkButton>
            ) : null}
            <ActionButton
              action={deleteMemberAction}
              input={{ id: member.id }}
              variant="danger"
              confirm={deleteConfirmation(fullName, member.memberships.length)}
              success="Fiche supprimée."
              redirectTo="/timonerie/adherents"
              size="icon"
              title="Supprimer la fiche"
              ariaLabel="Supprimer la fiche"
            >
              <TrashIcon />
            </ActionButton>
          </>
        }
      />

      {minorNeedsReview ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-m border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          <span>
            La case « mineur » de {member.firstName} n&apos;a pas été vérifiée depuis plus d&apos;un
            an : confirmez-la en personne lors de sa prochaine venue.
          </span>
          <span className="flex gap-2">
            <ActionButton
              action={markMinorReviewed}
              input={{ id: member.id, isMinor: false }}
              success="Fiche passée en majeur."
            >
              Passer en majeur
            </ActionButton>
            <ActionButton
              action={markMinorReviewed}
              input={{ id: member.id, isMinor: true }}
              success="Case confirmée pour cette saison."
            >
              Toujours mineur
            </ActionButton>
          </span>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-6">
          <MemberSheet
            games={games}
            startEditing={startEditing}
            values={{
              id: member.id,
              firstName: member.firstName,
              lastName: member.lastName,
              isMinor: member.isMinor,
              cardNumber: member.cardNumber,
              status: member.status,
              notes: member.notes,
              imageRightsGallery: member.imageRightsGallery,
              imageRightsGallerySource: member.imageRightsGallerySource,
              imageRightsGalleryAt: dayOrNull(member.imageRightsGalleryAt),
              imageRightsSocial: member.imageRightsSocial,
              imageRightsSocialSource: member.imageRightsSocialSource,
              imageRightsSocialAt: dayOrNull(member.imageRightsSocialAt),
              parentalDocumentReceived: member.parentalDocumentReceived,
              parentalDocumentReceivedAt: dayOrNull(member.parentalDocumentReceivedAt),
              gameIds: member.gameIds.map((g) => ({ gameId: g.gameId, value: g.value })),
            }}
            summary={
              <div className="grid gap-5 text-sm">
                <DefinitionList
                  items={[
                    ["Prénom", member.firstName],
                    ["Nom", member.lastName],
                    [
                      "Mineur",
                      member.isMinor
                        ? `Oui${member.minorReviewedAt ? ` · vérifié le ${formatDay(member.minorReviewedAt)}` : ""}`
                        : "Non",
                    ],
                    ["N° de carte", member.cardNumber ?? "—"],
                    [
                      "Statut",
                      member.status === "SUSPENDED"
                        ? "Suspendu (réglé à la main)"
                        : `${memberStatusLabel[member.status]} (calculé d'après les adhésions)`,
                    ],
                    ["Notes internes", member.notes ?? "—"],
                  ]}
                />
                <div>
                  <p className="label mb-2">Identifiants de jeu</p>
                  {member.gameIds.length === 0 ? (
                    <p className="text-ivory-3">Aucun identifiant renseigné.</p>
                  ) : (
                    <DefinitionList
                      items={member.gameIds.map((g): [string, React.ReactNode] => [
                        `${g.game.name}`,
                        <span key={g.id}>
                          <span className="font-mono">{g.value}</span>
                          <span className="text-ivory-3"> · {g.game.playerIdLabel}</span>
                        </span>,
                      ])}
                    />
                  )}
                </div>
                <div>
                  <p className="label mb-2">Autorisations</p>
                  <DefinitionList
                    items={[
                      [
                        "Galerie du site",
                        consent(
                          member.imageRightsGallery,
                          member.imageRightsGallerySource,
                          member.imageRightsGalleryAt,
                        ),
                      ],
                      [
                        "Réseaux",
                        consent(
                          member.imageRightsSocial,
                          member.imageRightsSocialSource,
                          member.imageRightsSocialAt,
                        ),
                      ],
                      ...(member.isMinor
                        ? ([
                            [
                              "Autorisation parentale",
                              member.parentalDocumentReceived
                                ? `Reçue${member.parentalDocumentReceivedAt ? ` le ${formatDay(member.parentalDocumentReceivedAt)}` : ""}`
                                : "Manquante",
                            ],
                          ] as [string, React.ReactNode][])
                        : []),
                    ]}
                  />
                </div>
              </div>
            }
          />

          <Card title="Adhésions">
            {member.memberships.length === 0 ? (
              <EmptyState>Aucune adhésion enregistrée.</EmptyState>
            ) : (
              <MembershipsTable
                plans={membershipPlans.map((p) => ({
                  id: p.id,
                  name: p.name,
                  durationDays: p.durationDays,
                }))}
                rows={member.memberships.map((m) => ({
                  id: m.id,
                  planId: m.planId,
                  planName: m.plan.name,
                  startDate: dbDateToDay(m.startDate),
                  endDate: dbDateToDay(m.endDate),
                  amountCents: m.amountCents,
                  paymentMethod: m.paymentMethod,
                  transactionRef: m.transactionRef,
                  cardHandedOverAt: m.cardHandedOverAt ? parisDay(m.cardHandedOverAt) : null,
                  renewed: Boolean(m.renewedBy),
                  ended: dbDateToDay(m.endDate) < today,
                }))}
              />
            )}

            <div className="mt-5 grid gap-3">
              {latest ? (
                <details
                  className="rounded-m border border-line p-4"
                  open={dbDateToDay(latest.endDate) <= today}
                >
                  <summary className="cursor-pointer font-head text-sm tracking-[0.06em] text-rose">
                    Renouveler
                  </summary>
                  <div className="mt-4">
                    <RenewMembershipForm
                      previousId={latest.id}
                      previousEnd={dbDateToDay(latest.endDate)}
                      previousPlanId={latest.planId}
                      plans={membershipPlans}
                      cardNumber={member.cardNumber}
                      today={today}
                    />
                  </div>
                </details>
              ) : null}
              <details className="rounded-m border border-line p-4" open={!latest}>
                <summary className="cursor-pointer font-head text-sm tracking-[0.06em] text-rose">
                  Enregistrer une adhésion
                </summary>
                <div className="mt-4">
                  <RecordMembershipForm
                    memberId={member.id}
                    plans={membershipPlans}
                    cardNumber={member.cardNumber}
                    today={today}
                  />
                </div>
              </details>
            </div>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          {member.isMinor ? (
            <Card title="Autorisation parentale">
              {member.parentalDocumentFile ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <a
                    href={`/api/timonerie/fichiers/${member.parentalDocumentFile.id}`}
                    target="_blank"
                    rel="noopener"
                    className="text-rose hover:underline"
                  >
                    {member.parentalDocumentFile.filename}
                  </a>
                  <span className="text-xs text-ivory-3">
                    {formatBytes(member.parentalDocumentFile.size)} · joint le{" "}
                    {formatDay(member.parentalDocumentFile.createdAt)}
                  </span>
                  <ActionButton
                    action={removeParentalDocument}
                    input={{ id: member.id }}
                    variant="subtle"
                    confirm="Retirer le scan de la fiche ?"
                    success="Scan retiré."
                  >
                    Retirer
                  </ActionButton>
                </div>
              ) : (
                <p className="mb-3 text-sm text-ivory-3">Aucun scan joint (facultatif).</p>
              )}
              <ParentalUploadForm memberId={member.id} />
            </Card>
          ) : null}

          <Card title="Inscriptions récentes">
            {member.registrations.length === 0 ? (
              <p className="text-sm text-ivory-3">Aucune inscription rapprochée de cette fiche.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {member.registrations.map((r) => (
                  <li key={r.id} className="flex justify-between gap-2 py-2">
                    <Link href={`/timonerie/evenements/${r.event.id}`} className="hover:text-rose">
                      {r.event.title}
                    </Link>
                    <span className="text-xs text-ivory-3">
                      {formatDay(r.event.startsAt)} · {registrationStatusLabel[r.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {member._count.taggedPhotos > 0 ? (
              <p className="mt-3 text-xs text-ivory-3">
                Identifié·e sur {member._count.taggedPhotos} photo(s) de la galerie.
              </p>
            ) : null}
          </Card>

          <Card title="Historique de la fiche">
            {history.length === 0 ? (
              <p className="text-sm text-ivory-3">Aucune modification tracée.</p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {history.map((h) => (
                  <li key={h.id} className="flex justify-between gap-2">
                    <span>
                      {auditActionLabel[h.action]}
                      {h.actor === "SYSTEM" ? (
                        <span className="text-ivory-3"> (automatique)</span>
                      ) : null}
                    </span>
                    <span className="text-xs text-ivory-3">{formatDateTime(h.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Suppression">
            <p className="mb-4 text-sm text-ivory-2">
              <b>Corbeille</b> : la fiche disparaît des listes, reste restaurable, et sera supprimée
              automatiquement dans 30 jours.
            </p>
            <p className="mb-4 text-sm text-ivory-2">
              <b>Supprimer la fiche</b> : immédiat et définitif.{" "}
              {member.memberships.length > 0
                ? `Nom, identifiants de jeu, autorisations et documents sont effacés ; ses ${member.memberships.length} adhésion(s) restent en comptabilité sous « Ancien membre ».`
                : "Aucune adhésion n'est enregistrée : la fiche est entièrement effacée de la base."}
            </p>
            <div className="flex flex-wrap gap-2">
              {member.deletedAt ? (
                <ActionButton
                  action={restoreMember}
                  input={{ id: member.id }}
                  success="Fiche restaurée."
                >
                  Restaurer la fiche
                </ActionButton>
              ) : (
                <ActionButton
                  action={trashMember}
                  input={{ id: member.id }}
                  confirm="Mettre cette fiche à la corbeille ?"
                  success="Fiche mise à la corbeille."
                >
                  Mettre à la corbeille
                </ActionButton>
              )}
              <ActionButton
                action={deleteMemberAction}
                input={{ id: member.id }}
                variant="danger"
                confirm={deleteConfirmation(fullName, member.memberships.length)}
                success="Fiche supprimée."
                redirectTo="/timonerie/adherents"
              >
                Supprimer définitivement
              </ActionButton>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
