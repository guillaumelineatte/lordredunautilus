"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { RegistrationSource, RegistrationStatus } from "@/generated/prisma/enums";
import { registrationSourceLabel, registrationStatusLabel } from "@/lib/labels";
import { dedupeKey } from "@/lib/text";
import {
  addRegistration,
  deleteRegistration,
  linkRegistrationToMember,
  promoteRegistration,
  setRegistrationStatus,
} from "@/server/actions/events";
import { ActionButton } from "./action-button";
import { ActionForm, SelectField, SubmitButton, TextField } from "./form";
import { useToast } from "./toast";
import { Badge } from "./ui";

export type RegistrationRowData = {
  id: string;
  firstName: string;
  lastName: string;
  playerId: string | null;
  hasEmail: boolean;
  status: RegistrationStatus;
  source: RegistrationSource;
  memberId: string | null;
  createdAt: string;
};

type MemberOption = { id: string; firstName: string; lastName: string };

const tone = {
  REGISTERED: "neutral",
  WAITLISTED: "warn",
  PRESENT: "ok",
  ABSENT: "danger",
  CANCELLED: "neutral",
} as const;

function MemberLink({ reg, members }: { reg: RegistrationRowData; members: MemberOption[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, start] = useTransition();
  const key = dedupeKey(reg.firstName, reg.lastName);
  const suggested = members.filter((m) => dedupeKey(m.firstName, m.lastName) === key);
  const others = members.filter((m) => !suggested.includes(m));
  return (
    <select
      aria-label={`Fiche adhérent de ${reg.firstName} ${reg.lastName}`}
      value={reg.memberId ?? ""}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          const res = await linkRegistrationToMember({
            registrationId: reg.id,
            memberId: e.target.value || null,
          });
          if (!res.ok) notify(res.error, "error");
          else
            notify(
              e.target.value ? "Inscription rapprochée de la fiche." : "Rapprochement retiré.",
            );
          router.refresh();
        })
      }
      className="field-input w-44 py-1 text-xs"
    >
      <option value="">{suggested.length ? "Rapprocher (suggestion ↓)" : "Non rapproché"}</option>
      {suggested.map((m) => (
        <option key={m.id} value={m.id}>
          ★ {m.lastName} {m.firstName}
        </option>
      ))}
      {others.map((m) => (
        <option key={m.id} value={m.id}>
          {m.lastName} {m.firstName}
        </option>
      ))}
    </select>
  );
}

export function RegistrationsTable({
  rows,
  members,
  playerIdLabel,
}: {
  rows: RegistrationRowData[];
  members: MemberOption[];
  playerIdLabel: string;
}) {
  if (rows.length === 0)
    return <p className="text-sm text-ivory-3">Personne n&apos;est encore inscrit.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr>
            <th>Participant</th>
            <th>{playerIdLabel}</th>
            <th>Statut</th>
            <th>Fiche adhérent</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={r.status === "CANCELLED" ? "opacity-50" : ""}>
              <td>
                <span className="font-semibold">
                  {r.lastName} {r.firstName}
                </span>
                <p className="text-xs text-ivory-3">
                  {registrationSourceLabel[r.source]}
                  {r.hasEmail ? " · e-mail fourni" : ""}
                </p>
              </td>
              <td className="font-mono text-xs">{r.playerId ?? "—"}</td>
              <td>
                <Badge tone={tone[r.status]}>{registrationStatusLabel[r.status]}</Badge>
              </td>
              <td>
                <MemberLink reg={r} members={members} />
              </td>
              <td>
                <div className="flex flex-wrap justify-end gap-1">
                  {r.status === "WAITLISTED" ? (
                    <ActionButton
                      action={promoteRegistration}
                      input={{ id: r.id }}
                      variant="primary"
                      success="Participant promu."
                    >
                      Promouvoir
                    </ActionButton>
                  ) : null}
                  {r.status !== "CANCELLED" && r.status !== "WAITLISTED" ? (
                    <>
                      <ActionButton
                        action={setRegistrationStatus}
                        input={{
                          id: r.id,
                          status: r.status === "PRESENT" ? "REGISTERED" : "PRESENT",
                        }}
                        variant={r.status === "PRESENT" ? "primary" : "ghost"}
                        title="Pointer présent"
                      >
                        Présent
                      </ActionButton>
                      <ActionButton
                        action={setRegistrationStatus}
                        input={{
                          id: r.id,
                          status: r.status === "ABSENT" ? "REGISTERED" : "ABSENT",
                        }}
                        variant={r.status === "ABSENT" ? "danger" : "ghost"}
                        title="Pointer absent"
                      >
                        Absent
                      </ActionButton>
                    </>
                  ) : null}
                  {r.status !== "CANCELLED" ? (
                    <ActionButton
                      action={setRegistrationStatus}
                      input={{ id: r.id, status: "CANCELLED" }}
                      variant="subtle"
                      confirm="Annuler cette inscription ?"
                    >
                      Annuler
                    </ActionButton>
                  ) : (
                    <ActionButton
                      action={deleteRegistration}
                      input={{ id: r.id }}
                      variant="subtle"
                      confirm="Supprimer définitivement cette inscription ?"
                    >
                      Supprimer
                    </ActionButton>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AddRegistrationForm({
  eventId,
  members,
  playerIdLabel,
}: {
  eventId: string;
  members: MemberOption[];
  playerIdLabel: string;
}) {
  return (
    <ActionForm
      action={addRegistration}
      success="Participant ajouté."
      extra={{ eventId }}
      resetOnSuccess
    >
      <div className="grid gap-3 md:grid-cols-2">
        <TextField label="Prénom" name="firstName" required />
        <TextField label="Nom" name="lastName" required />
        <TextField label={playerIdLabel} name="playerId" />
        <SelectField
          label="Fiche adhérent (facultatif)"
          name="memberId"
          options={members.map((m) => ({ value: m.id, label: `${m.lastName} ${m.firstName}` }))}
          placeholder="Aucune"
        />
      </div>
      <div className="flex justify-end">
        <SubmitButton variant="ghost">Ajouter le participant</SubmitButton>
      </div>
    </ActionForm>
  );
}
