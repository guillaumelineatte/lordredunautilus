"use client";

import { useState } from "react";
import { membershipEnd, renewalStart } from "@/lib/dates";
import { formatAmount, formatDay } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/labels";
import {
  recordMembershipAction,
  renewMembershipAction,
  uploadParentalDocument,
} from "@/server/actions/members";
import { ActionForm, CheckboxField, Field, SelectField, SubmitButton, TextField } from "./form";

type Plan = {
  id: string;
  name: string;
  priceCents: number;
  reducedPriceCents: number | null;
  durationDays: number | null;
};

const paymentOptions = Object.entries(paymentMethodLabel).map(([value, label]) => ({
  value,
  label,
}));

function PlanFields({
  plans,
  planId,
  setPlanId,
}: {
  plans: Plan[];
  planId: string;
  setPlanId: (id: string) => void;
}) {
  const plan = plans.find((p) => p.id === planId);
  return (
    <>
      <SelectField
        label="Formule"
        name="planId"
        value={planId}
        onChange={(e) => setPlanId(e.target.value)}
        options={plans.map((p) => ({
          value: p.id,
          label: `${p.name} — ${formatAmount(p.priceCents)} €`,
        }))}
      />
      <TextField
        label="Montant reçu (€)"
        name="amount"
        inputMode="decimal"
        placeholder={plan ? formatAmount(plan.priceCents) : ""}
        hint={
          plan?.reducedPriceCents != null
            ? `Vide = prix de la formule. Tarif réduit : ${formatAmount(plan.reducedPriceCents)} €.`
            : "Vide = prix de la formule."
        }
      />
    </>
  );
}

function PaymentFields({ cardNumber }: { cardNumber: string | null }) {
  return (
    <>
      <SelectField
        label="Mode de paiement"
        name="paymentMethod"
        defaultValue="PAYPAL"
        options={paymentOptions}
      />
      <TextField
        label="Référence PayPal (facultatif)"
        name="transactionRef"
        maxLength={64}
        placeholder="ex. 8AB12345CD678901E"
      />
      <TextField
        label="Numéro de carte"
        name="cardNumber"
        defaultValue={cardNumber ?? ""}
        placeholder="NAU-2026-001"
      />
      <CheckboxField
        label="Carte remise en main propre"
        name="cardHandedOver"
        className="self-end pb-2"
      />
    </>
  );
}

export function RecordMembershipForm({
  memberId,
  plans,
  cardNumber,
  today,
}: {
  memberId: string;
  plans: Plan[];
  cardNumber: string | null;
  today: string;
}) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [start, setStart] = useState(today);
  const plan = plans.find((p) => p.id === planId);
  const end = plan?.durationDays && start ? membershipEnd(start, plan.durationDays) : null;

  if (plans.length === 0)
    return (
      <p className="text-sm text-ivory-3">
        Créez d&apos;abord une formule d&apos;adhésion dans Contenus → Formules.
      </p>
    );

  return (
    <ActionForm
      action={recordMembershipAction}
      success="Adhésion enregistrée."
      extra={{ memberId }}
      resetOnSuccess
    >
      <div className="grid gap-4 md:grid-cols-2">
        <PlanFields plans={plans} planId={planId} setPlanId={setPlanId} />
        <Field
          label="Date de début"
          name="startDate"
          hint={end ? `Fin calculée : ${formatDay(end)}` : undefined}
        >
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
        <PaymentFields cardNumber={cardNumber} />
      </div>
      <div className="flex justify-end">
        <SubmitButton>Enregistrer l&apos;adhésion</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function RenewMembershipForm({
  previousId,
  previousEnd,
  previousPlanId,
  plans,
  cardNumber,
  today,
}: {
  previousId: string;
  previousEnd: string;
  previousPlanId: string;
  plans: Plan[];
  cardNumber: string | null;
  today: string;
}) {
  const [planId, setPlanId] = useState(
    plans.some((p) => p.id === previousPlanId) ? previousPlanId : (plans[0]?.id ?? ""),
  );
  const plan = plans.find((p) => p.id === planId);
  const start = renewalStart(previousEnd, today);
  const end = plan?.durationDays ? membershipEnd(start, plan.durationDays) : null;
  return (
    <ActionForm
      action={renewMembershipAction}
      success="Adhésion renouvelée."
      extra={{ previousId }}
    >
      <p className="text-sm text-ivory-2">
        Nouvelle période : du {formatDay(start)}
        {end ? ` au ${formatDay(end)}` : ""}
        {start > today ? " (dans la continuité de l'adhésion en cours)" : ""}.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <PlanFields plans={plans} planId={planId} setPlanId={setPlanId} />
        <PaymentFields cardNumber={cardNumber} />
      </div>
      <div className="flex justify-end">
        <SubmitButton>Renouveler</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function ParentalUploadForm({ memberId }: { memberId: string }) {
  return (
    <ActionForm
      action={uploadParentalDocument}
      success="Scan joint à la fiche."
      extra={{ memberId }}
      resetOnSuccess
      className="gap-3"
    >
      <Field label="Scan de l'autorisation signée (PDF ou image, 5 Mo max)" name="file">
        {(p) => (
          <input
            {...p}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="field-input file:mr-3 file:rounded-full file:border-0 file:bg-surface-2 file:px-3 file:py-1 file:text-ivory"
          />
        )}
      </Field>
      <div>
        <SubmitButton variant="ghost">Joindre le scan</SubmitButton>
      </div>
    </ActionForm>
  );
}
