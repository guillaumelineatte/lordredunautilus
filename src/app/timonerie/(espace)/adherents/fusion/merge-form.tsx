"use client";

import { ActionForm, SelectField, SubmitButton } from "@/components/admin/form";
import { mergeMembersAction } from "@/server/actions/members";

export function MergeForm({
  options,
  keepId,
  dropId,
}: {
  options: { id: string; label: string }[];
  keepId?: string;
  dropId?: string;
}) {
  const opts = options.map((o) => ({ value: o.id, label: o.label }));
  return (
    <ActionForm
      action={mergeMembersAction}
      success="Fiches fusionnées."
      redirectTo={(d: { id: string }) => `/timonerie/adherents/${d.id}`}
      confirm="Fusionner ces deux fiches ? La seconde sera supprimée."
    >
      <div className="grid gap-3 md:grid-cols-2">
        <SelectField
          label="Fiche à conserver"
          name="keepId"
          defaultValue={keepId ?? ""}
          options={opts}
          placeholder="Choisir…"
        />
        <SelectField
          label="Fiche à fusionner puis supprimer"
          name="dropId"
          defaultValue={dropId ?? ""}
          options={opts}
          placeholder="Choisir…"
        />
      </div>
      <div>
        <SubmitButton variant="ghost">Fusionner</SubmitButton>
      </div>
    </ActionForm>
  );
}
