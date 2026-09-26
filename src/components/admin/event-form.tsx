"use client";

import { useState } from "react";
import type { EventStatus, EventType } from "@/generated/prisma/enums";
import { formatAmount } from "@/lib/format";
import { eventStatusLabel, eventTypeLabel } from "@/lib/labels";
import { saveEvent } from "@/server/actions/events";
import {
  ActionForm,
  CheckboxField,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "./form";

export type EventFormValues = {
  id?: string;
  title: string;
  gameId: string | null;
  type: EventType;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  description: string | null;
  capacity: number | null;
  priceCents: number | null;
  isHot: boolean;
  status: EventStatus;
};

export function EventForm({
  games,
  initial,
  defaultLocation,
}: {
  games: { id: string; name: string }[];
  initial?: EventFormValues;
  defaultLocation: string;
}) {
  const [type, setType] = useState<EventType>(initial?.type ?? "DISCOVERY");
  return (
    <ActionForm
      action={saveEvent}
      success={initial?.id ? "Événement enregistré." : "Événement créé."}
      redirectTo={initial?.id ? undefined : (d: { id: string }) => `/admin/evenements/${d.id}`}
      extra={initial?.id ? { id: initial.id } : undefined}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Titre"
          name="title"
          defaultValue={initial?.title}
          required
          className="md:col-span-2"
        />
        <SelectField
          label="Jeu"
          name="gameId"
          defaultValue={initial?.gameId ?? ""}
          options={games.map((g) => ({ value: g.id, label: g.name }))}
          placeholder="Plusieurs jeux / aucun"
        />
        <SelectField
          label="Type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as EventType)}
          options={Object.entries(eventTypeLabel).map(([value, label]) => ({
            value,
            label: label.charAt(0).toUpperCase() + label.slice(1),
          }))}
          hint={
            type === "OPEN_PLAY" ? "Soirée libre : pas d'inscription, pas de capacité." : undefined
          }
        />
        <TextField label="Date" name="date" type="date" defaultValue={initial?.date} required />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Début"
            name="startTime"
            type="time"
            defaultValue={initial?.startTime ?? "19:00"}
            required
          />
          <TextField label="Fin" name="endTime" type="time" defaultValue={initial?.endTime ?? ""} />
        </div>
        <TextField
          label="Lieu"
          name="location"
          defaultValue={initial?.location ?? ""}
          placeholder={defaultLocation}
          hint="Vide = le local de l'association."
        />
        {type !== "OPEN_PLAY" ? (
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Places"
              name="capacity"
              type="number"
              min={1}
              defaultValue={initial?.capacity ?? ""}
              hint="Vide = sans limite."
            />
            <TextField
              label="Prix d'inscription (€)"
              name="price"
              inputMode="decimal"
              defaultValue={initial?.priceCents != null ? formatAmount(initial.priceCents) : ""}
              hint="Vide = gratuit."
            />
          </div>
        ) : (
          <div />
        )}
        <TextAreaField
          label="Description"
          name="description"
          defaultValue={initial?.description ?? ""}
          rows={6}
          className="md:col-span-2"
          hint="Markdown accepté : **gras**, listes avec « - », liens [texte](https://…)."
        />
        <SelectField
          label="Statut"
          name="status"
          defaultValue={initial?.status ?? "DRAFT"}
          options={Object.entries(eventStatusLabel).map(([value, label]) => ({ value, label }))}
          hint="Seuls les événements publiés apparaissent sur le site."
        />
        <CheckboxField
          label="Mettre en avant (« Places limitées »)"
          name="isHot"
          defaultChecked={initial?.isHot}
          className="self-end pb-2"
        />
      </div>
      <div className="flex justify-end">
        <SubmitButton>{initial?.id ? "Enregistrer l'événement" : "Créer l'événement"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
