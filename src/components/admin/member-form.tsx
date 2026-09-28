"use client";

import { useState } from "react";
import type { ConsentSource, MemberStatus } from "@/generated/prisma/enums";
import { consentSourceLabel } from "@/lib/labels";
import { matchesPattern } from "@/lib/text";
import { saveMember } from "@/server/actions/members";
import {
  ActionForm,
  CheckboxField,
  FormError,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "./form";
import { Button } from "./ui";

type Game = {
  id: string;
  name: string;
  playerIdLabel: string;
  playerIdPattern: string | null;
  playerIdExample: string | null;
};

export type MemberFormValues = {
  id?: string;
  firstName: string;
  lastName: string;
  cardNumber: string | null;
  status: MemberStatus;
  notes: string | null;
  imageRightsGallery: boolean;
  imageRightsGallerySource: ConsentSource | null;
  imageRightsGalleryAt: string | null;
  imageRightsSocial: boolean;
  imageRightsSocialSource: ConsentSource | null;
  imageRightsSocialAt: string | null;
  gameIds: { gameId: string; value: string }[];
};

const consentOptions = Object.entries(consentSourceLabel).map(([value, label]) => ({
  value,
  label,
}));

export function MemberForm({
  games,
  initial,
  onDone,
  onCancel,
}: {
  games: Game[];
  initial?: MemberFormValues;
  onDone?: () => void; // après un enregistrement réussi
  onCancel?: () => void;
}) {
  const editing = Boolean(initial?.id);
  const [gallery, setGallery] = useState(initial?.imageRightsGallery ?? false);
  const [social, setSocial] = useState(initial?.imageRightsSocial ?? false);
  const [gameIds, setGameIds] = useState(initial?.gameIds ?? []);
  const available = games.filter((g) => !gameIds.some((e) => e.gameId === g.id));

  return (
    <ActionForm
      action={saveMember}
      success={editing ? "Modifications enregistrées." : "Adhérent créé."}
      redirectTo={editing ? undefined : (data: { id: string }) => `/timonerie/adherents/${data.id}`}
      onSuccess={() => onDone?.()}
      extra={{ gameIds: JSON.stringify(gameIds), ...(initial?.id ? { id: initial.id } : {}) }}
      className="gap-6"
    >
      <fieldset className="card grid gap-4 p-5 md:grid-cols-2">
        <legend className="kicker px-1">Identité</legend>
        <TextField
          label="Prénom"
          name="firstName"
          defaultValue={initial?.firstName}
          autoComplete="off"
          required
        />
        <TextField
          label="Nom"
          name="lastName"
          defaultValue={initial?.lastName}
          autoComplete="off"
          required
        />
        <TextField
          label="Numéro de carte"
          name="cardNumber"
          defaultValue={initial?.cardNumber ?? ""}
          placeholder="NAU-2026-001"
        />
        <CheckboxField
          label="Adhérent suspendu"
          name="suspended"
          defaultChecked={initial?.status === "SUSPENDED"}
          hint="Sinon, le statut actif / désabonné est calculé automatiquement d'après les adhésions."
        />
        <TextAreaField
          label="Notes internes"
          name="notes"
          defaultValue={initial?.notes ?? ""}
          maxLength={500}
          rows={2}
          className="md:col-span-2"
          hint="À utiliser avec parcimonie : 500 caractères, rien de sensible (santé, opinions…)."
        />
      </fieldset>

      <fieldset className="card grid gap-3 p-5">
        <legend className="kicker px-1">Identifiants de jeu</legend>
        {gameIds.length === 0 ? (
          <p className="text-sm text-ivory-3">Aucun identifiant pour l&apos;instant.</p>
        ) : null}
        {gameIds.map((entry, i) => {
          const game = games.find((g) => g.id === entry.gameId);
          if (!game) return null;
          const valid = !entry.value || matchesPattern(entry.value, game.playerIdPattern);
          return (
            <div key={entry.gameId} className="grid items-end gap-2 sm:grid-cols-[12rem_1fr_auto]">
              <p className="pb-2 text-sm">{game.name}</p>
              <div className="grid gap-1">
                <label className="label" htmlFor={`gid-${game.id}`}>
                  {game.playerIdLabel}
                </label>
                <input
                  id={`gid-${game.id}`}
                  value={entry.value}
                  placeholder={game.playerIdExample ?? ""}
                  aria-invalid={!valid}
                  onChange={(e) =>
                    setGameIds(
                      gameIds.map((g, j) => (j === i ? { ...g, value: e.target.value } : g)),
                    )
                  }
                  className="field-input"
                />
                {!valid ? (
                  <p className="text-xs text-danger">
                    Format attendu{game.playerIdExample ? ` : ${game.playerIdExample}` : ""}.
                  </p>
                ) : null}
              </div>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => setGameIds(gameIds.filter((_, j) => j !== i))}
              >
                Retirer
              </Button>
            </div>
          );
        })}
        {available.length > 0 ? (
          <div className="flex items-center gap-2">
            <label htmlFor="add-game" className="sr-only">
              Ajouter un jeu
            </label>
            <select
              id="add-game"
              value=""
              onChange={(e) =>
                e.target.value && setGameIds([...gameIds, { gameId: e.target.value, value: "" }])
              }
              className="field-input w-auto"
            >
              <option value="">+ Ajouter un jeu…</option>
              {available.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <FormError name="gameIds" />
      </fieldset>

      <fieldset className="card grid gap-4 p-5 md:grid-cols-2">
        <legend className="kicker px-1">Droit à l&apos;image</legend>
        <div className="grid gap-3">
          <CheckboxField
            label="Photos autorisées dans la galerie du site"
            name="imageRightsGallery"
            checked={gallery}
            onChange={(e) => setGallery(e.target.checked)}
          />
          {gallery ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Source"
                name="imageRightsGallerySource"
                defaultValue={initial?.imageRightsGallerySource ?? ""}
                options={consentOptions}
                placeholder="Choisir…"
              />
              <TextField
                label="Date"
                name="imageRightsGalleryAt"
                type="date"
                defaultValue={initial?.imageRightsGalleryAt ?? ""}
              />
            </div>
          ) : null}
        </div>
        <div className="grid gap-3">
          <CheckboxField
            label="Photos autorisées sur les réseaux (Discord, Instagram)"
            name="imageRightsSocial"
            checked={social}
            onChange={(e) => setSocial(e.target.checked)}
          />
          {social ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Source"
                name="imageRightsSocialSource"
                defaultValue={initial?.imageRightsSocialSource ?? ""}
                options={consentOptions}
                placeholder="Choisir…"
              />
              <TextField
                label="Date"
                name="imageRightsSocialAt"
                type="date"
                defaultValue={initial?.imageRightsSocialAt ?? ""}
              />
            </div>
          ) : null}
        </div>
      </fieldset>

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button variant="subtle" onClick={onCancel}>
            Annuler
          </Button>
        ) : null}
        <SubmitButton>
          {editing ? "Enregistrer les modifications" : "Créer l'adhérent"}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
