"use client";

import { useState } from "react";
import type { ConsentSource, MemberStatus } from "@/generated/prisma/enums";
import { consentSourceLabel, memberStatusLabel } from "@/lib/labels";
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
  birthYear: number | null;
  isMinor: boolean;
  cardNumber: string | null;
  status: MemberStatus;
  notes: string | null;
  imageRightsGallery: boolean;
  imageRightsGallerySource: ConsentSource | null;
  imageRightsGalleryAt: string | null;
  imageRightsSocial: boolean;
  imageRightsSocialSource: ConsentSource | null;
  imageRightsSocialAt: string | null;
  parentalDocumentReceived: boolean;
  parentalDocumentReceivedAt: string | null;
  gameIds: { gameId: string; value: string }[];
};

const consentOptions = Object.entries(consentSourceLabel).map(([value, label]) => ({
  value,
  label,
}));

export function MemberForm({ games, initial }: { games: Game[]; initial?: MemberFormValues }) {
  const [isMinor, setIsMinor] = useState(initial?.isMinor ?? false);
  const [gallery, setGallery] = useState(initial?.imageRightsGallery ?? false);
  const [social, setSocial] = useState(initial?.imageRightsSocial ?? false);
  const [gameIds, setGameIds] = useState(initial?.gameIds ?? []);
  const available = games.filter((g) => !gameIds.some((e) => e.gameId === g.id));
  const currentYear = new Date().getFullYear();

  return (
    <ActionForm
      action={saveMember}
      success={initial?.id ? "Fiche enregistrée." : "Adhérent créé."}
      redirectTo={initial?.id ? undefined : (data: { id: string }) => `/admin/adherents/${data.id}`}
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
          label="Année de naissance"
          name="birthYear"
          type="number"
          inputMode="numeric"
          min={1900}
          max={currentYear}
          defaultValue={initial?.birthYear ?? ""}
          hint="L'année seule, jamais la date complète."
        />
        <TextField
          label="Numéro de carte"
          name="cardNumber"
          defaultValue={initial?.cardNumber ?? ""}
          placeholder="NAU-2026-001"
        />
        <div className="grid gap-2">
          <CheckboxField
            label="Mineur"
            name="isMinor"
            checked={isMinor}
            onChange={(e) => setIsMinor(e.target.checked)}
            hint="Case saisie à la main, à revoir chaque année."
          />
          {initial?.id && initial.isMinor ? (
            <CheckboxField
              label="J'ai vérifié la case « mineur » pour cette saison"
              name="minorReviewed"
            />
          ) : null}
        </div>
        <SelectField
          label="Statut"
          name="status"
          defaultValue={initial?.status ?? "ACTIVE"}
          options={Object.entries(memberStatusLabel).map(([value, label]) => ({ value, label }))}
          hint="Actif / échu est recalculé à chaque adhésion ; « suspendu » reste jusqu'à modification."
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
          {gallery && isMinor ? (
            <p className="text-xs text-warn">
              Pour un mineur, seule une autorisation « papier signé » permet de publier une photo.
            </p>
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

      {isMinor ? (
        <fieldset className="card grid gap-4 p-5 md:grid-cols-2">
          <legend className="kicker px-1">Autorisation parentale</legend>
          <CheckboxField
            label="Autorisation parentale signée reçue (ligne « adhésion » cochée)"
            name="parentalDocumentReceived"
            defaultChecked={initial?.parentalDocumentReceived}
          />
          <TextField
            label="Reçue le"
            name="parentalDocumentReceivedAt"
            type="date"
            defaultValue={initial?.parentalDocumentReceivedAt ?? ""}
          />
          <p className="text-xs text-ivory-3 md:col-span-2">
            Générez le formulaire pré-rempli depuis la fiche, faites-le signer, puis cochez ici les
            cases miroir et joignez le scan.
          </p>
        </fieldset>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton>{initial?.id ? "Enregistrer la fiche" : "Créer l'adhérent"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
