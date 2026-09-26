"use client";

import { Fragment, useState } from "react";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { membershipEnd } from "@/lib/dates";
import { formatAmount, formatDay, formatMoney } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/labels";
import {
  deleteMembership,
  setCardHandedOver,
  updateMembershipAction,
} from "@/server/actions/members";
import { ActionButton } from "./action-button";
import { ActionForm, Field, SelectField, SubmitButton, TextField } from "./form";
import { PencilIcon, TrashIcon } from "./icons";
import { Badge, Button } from "./ui";

export type MembershipRow = {
  id: string;
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  amountCents: number;
  paymentMethod: PaymentMethod;
  transactionRef: string | null;
  /** Jour de remise de la carte (AAAA-MM-JJ, heure de Paris). */
  cardHandedOverAt: string | null;
  renewed: boolean;
  ended: boolean;
};

type Plan = { id: string; name: string; durationDays: number | null };

const paymentOptions = Object.entries(paymentMethodLabel).map(([value, label]) => ({
  value,
  label,
}));

function MembershipEditor({
  row,
  plans,
  onClose,
}: {
  row: MembershipRow;
  plans: Plan[];
  onClose: () => void;
}) {
  const [planId, setPlanId] = useState(row.planId);
  const [start, setStart] = useState(row.startDate);
  const [end, setEnd] = useState(row.endDate);
  const plan = plans.find((p) => p.id === planId);
  const computedEnd = plan?.durationDays && start ? membershipEnd(start, plan.durationDays) : null;
  // La formule d'origine peut avoir été désactivée : on la garde dans la liste.
  const options = plans.some((p) => p.id === row.planId)
    ? plans
    : [{ id: row.planId, name: `${row.planName} (inactive)`, durationDays: null }, ...plans];

  return (
    <ActionForm
      action={updateMembershipAction}
      extra={{ id: row.id }}
      success="Adhésion modifiée."
      onSuccess={onClose}
      className="gap-3"
    >
      <div className="grid gap-3 md:grid-cols-3">
        <SelectField
          label="Formule"
          name="planId"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          options={options.map((p) => ({ value: p.id, label: p.name }))}
        />
        <Field label="Début" name="startDate">
          {(p) => (
            <input
              {...p}
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="field-input"
            />
          )}
        </Field>
        <Field
          label="Fin"
          name="endDate"
          hint={
            computedEnd && computedEnd !== end ? (
              <button
                type="button"
                className="text-rose underline"
                onClick={() => setEnd(computedEnd)}
              >
                Recalculer d&apos;après la formule : {formatDay(computedEnd)}
              </button>
            ) : undefined
          }
        >
          {(p) => (
            <input
              {...p}
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="field-input"
            />
          )}
        </Field>
        <TextField
          label="Montant (€)"
          name="amount"
          inputMode="decimal"
          defaultValue={formatAmount(row.amountCents)}
        />
        <SelectField
          label="Mode de paiement"
          name="paymentMethod"
          defaultValue={row.paymentMethod}
          options={paymentOptions}
        />
        <TextField
          label="Référence PayPal"
          name="transactionRef"
          defaultValue={row.transactionRef ?? ""}
          maxLength={64}
        />
      </div>
      <p className="text-xs text-ivory-3">
        Si la date de fin change, les alertes d&apos;échéance (J-30, J-7, J0) repartent de zéro et
        le statut du membre est recalculé.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="subtle" size="sm" onClick={onClose}>
          Annuler
        </Button>
        <SubmitButton>Enregistrer l&apos;adhésion</SubmitButton>
      </div>
    </ActionForm>
  );
}

/** Historique des adhésions, avec correction en ligne de chaque période. */
export function MembershipsTable({ rows, plans }: { rows: MembershipRow[]; plans: Plan[] }) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr>
            <th>Période</th>
            <th>Formule</th>
            <th>Paiement</th>
            <th>Suivi</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <Fragment key={m.id}>
              <tr className={editing === m.id ? "bg-ivory/[0.03]" : undefined}>
                <td className="whitespace-nowrap">
                  {formatDay(m.startDate)} → {formatDay(m.endDate)}
                </td>
                <td>
                  {m.planName}
                  <p className="text-xs text-ivory-3">{formatMoney(m.amountCents)}</p>
                </td>
                <td>
                  {paymentMethodLabel[m.paymentMethod]}
                  {m.transactionRef ? (
                    <p className="font-mono text-xs text-ivory-3">{m.transactionRef}</p>
                  ) : null}
                </td>
                <td className="space-y-1">
                  {m.renewed ? (
                    <Badge tone="ok">renouvelée</Badge>
                  ) : m.ended ? (
                    <Badge tone="warn">non renouvelée</Badge>
                  ) : (
                    <Badge>en cours</Badge>
                  )}
                  <div>
                    <ActionButton
                      action={setCardHandedOver}
                      input={{ id: m.id, handed: !m.cardHandedOverAt }}
                      variant="subtle"
                      success={
                        m.cardHandedOverAt ? "Remise annulée." : "Carte marquée comme remise."
                      }
                    >
                      {m.cardHandedOverAt
                        ? `Carte remise le ${formatDay(m.cardHandedOverAt)}`
                        : "Marquer la carte remise"}
                    </ActionButton>
                  </div>
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="subtle"
                      size="icon"
                      title="Modifier"
                      aria-label={`Modifier l'adhésion du ${formatDay(m.startDate)}`}
                      aria-expanded={editing === m.id}
                      onClick={() => setEditing(editing === m.id ? null : m.id)}
                    >
                      <PencilIcon />
                    </Button>
                    <ActionButton
                      action={deleteMembership}
                      input={{ id: m.id }}
                      variant="subtle"
                      size="icon"
                      className="hover:text-danger"
                      confirm="Supprimer cette adhésion ? (saisie erronée uniquement : elle disparaîtra de la comptabilité)"
                      success="Adhésion supprimée."
                      title="Supprimer"
                      ariaLabel={`Supprimer l'adhésion du ${formatDay(m.startDate)}`}
                    >
                      <TrashIcon />
                    </ActionButton>
                  </div>
                </td>
              </tr>
              {editing === m.id ? (
                <tr>
                  <td colSpan={5} className="bg-abyss/40">
                    <MembershipEditor row={m} plans={plans} onClose={() => setEditing(null)} />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
