"use client";

import clsx from "clsx";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type DragEvent } from "react";
import {
  deletePhoto,
  reorderPhotos,
  setPhotoPublished,
  updatePhoto,
} from "@/server/actions/photos";
import { ActionButton } from "./action-button";
import { ActionForm, SelectField, SubmitButton, TextField } from "./form";
import { useToast } from "./toast";
import { Badge, Button } from "./ui";

export type AdminPhoto = {
  id: string;
  thumbUrl: string;
  width: number;
  height: number;
  alt: string;
  caption: string | null;
  isPublished: boolean;
  event: { id: string; title: string } | null;
};

const MAX_EDGE = 2400;

/** Redimensionne dans le navigateur (≤ 2400 px, JPEG) pour passer sous la limite d'envoi. */
async function prepare(file: File): Promise<Blob> {
  if (file.size < 3_500_000 && file.type === "image/jpeg") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    return blob ?? file;
  } catch {
    return file; // format non décodable par le navigateur (HEIC…) : envoi tel quel
  }
}

function Uploader({ eventId }: { eventId?: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name),
    );
    if (list.length === 0) return;
    setProgress({ done: 0, total: list.length });
    let errors = 0;
    for (const [i, file] of list.entries()) {
      const body = new FormData();
      body.set("file", await prepare(file), file.name.replace(/\.\w+$/, ".jpg"));
      if (eventId) body.set("eventId", eventId);
      const res = await fetch("/api/timonerie/photos", { method: "POST", body });
      if (!res.ok) {
        errors++;
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        notify(`${file.name} : ${data.error ?? "échec de l'envoi"}`, "error");
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    if (errors < list.length) notify(`${list.length - errors} photo(s) ajoutée(s) en brouillon.`);
    router.refresh();
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={clsx(
        "grid place-items-center rounded-m border-2 border-dashed p-8 text-center transition-colors",
        over ? "border-rose bg-rose/5" : "border-line-strong",
      )}
    >
      <p className="mb-3 text-sm text-ivory-2">Glissez-déposez vos photos ici, ou</p>
      <Button variant="primary" onClick={() => input.current?.click()} disabled={Boolean(progress)}>
        Choisir des photos
      </Button>
      <input
        ref={input}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={(e) => e.target.files && upload(e.target.files)}
      />
      <p className="mt-3 text-xs text-ivory-3">
        {progress
          ? `Envoi ${progress.done}/${progress.total}…`
          : "Les photos arrivent en brouillon. Géolocalisation et métadonnées sont supprimées automatiquement."}
      </p>
    </div>
  );
}

function PhotoEditor({
  photo,
  events,
  onClose,
}: {
  photo: AdminPhoto;
  events: { id: string; title: string }[];
  onClose: () => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
      <Image
        src={photo.thumbUrl}
        alt={photo.alt || "Photo sans description"}
        width={photo.width}
        height={photo.height}
        className="h-auto w-full rounded-s"
      />
      <ActionForm
        action={updatePhoto}
        extra={{ id: photo.id }}
        success="Photo enregistrée."
        onSuccess={onClose}
      >
        <TextField
          label="Texte alternatif (décrit la photo pour les lecteurs d'écran)"
          name="alt"
          defaultValue={photo.alt}
          maxLength={250}
          hint="Facultatif : à défaut, la légende (ou une description générique) est utilisée."
        />
        <TextField
          label="Légende (facultatif)"
          name="caption"
          defaultValue={photo.caption ?? ""}
          maxLength={250}
        />
        <SelectField
          label="Soirée"
          name="eventId"
          defaultValue={photo.event?.id ?? ""}
          options={events.map((e) => ({ value: e.id, label: e.title }))}
          placeholder="Aucune"
        />
        <div className="flex justify-end gap-2">
          <Button variant="subtle" onClick={onClose}>
            Fermer
          </Button>
          <SubmitButton>Enregistrer</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}

export function GalleryManager({
  photos,
  events,
  eventId,
}: {
  photos: AdminPhoto[];
  events: { id: string; title: string }[];
  eventId?: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [order, setOrder] = useState(photos.map((p) => p.id));
  const [dragged, setDragged] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const byId = new Map(photos.map((p) => [p.id, p]));
  const ordered = order.map((id) => byId.get(id)).filter((p): p is AdminPhoto => Boolean(p));
  // Nouvelles photos apparues depuis le dernier rendu
  for (const p of photos) if (!order.includes(p.id)) ordered.push(p);
  const dirty = ordered.some((p, i) => photos[i]?.id !== p.id);

  function move(target: string) {
    if (!dragged || dragged === target) return;
    const ids = ordered.map((p) => p.id).filter((id) => id !== dragged);
    ids.splice(ids.indexOf(target), 0, dragged);
    setOrder(ids);
  }

  const current = editing ? byId.get(editing) : null;

  return (
    <div className="grid gap-6">
      <Uploader eventId={eventId} />

      {current ? (
        <div className="card p-5">
          <PhotoEditor
            key={current.id}
            photo={current}
            events={events}
            onClose={() => setEditing(null)}
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ivory-2">
          {ordered.length} photo(s) · glissez les vignettes pour changer l&apos;ordre
          d&apos;affichage.
        </p>
        {dirty ? (
          <Button
            variant="primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await reorderPhotos({ ids: ordered.map((p) => p.id) });
                if (!res.ok) notify(res.error, "error");
                else notify("Nouvel ordre enregistré.");
                router.refresh();
              })
            }
          >
            Enregistrer l&apos;ordre
          </Button>
        ) : null}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ordered.map((p) => {
          return (
            <li
              key={p.id}
              draggable
              onDragStart={() => setDragged(p.id)}
              onDragOver={(e) => {
                e.preventDefault();
                move(p.id);
              }}
              onDragEnd={() => setDragged(null)}
              className={clsx("card overflow-hidden", dragged === p.id && "opacity-40")}
            >
              <button
                type="button"
                onClick={() => setEditing(p.id)}
                className="block w-full cursor-grab"
              >
                <Image
                  src={p.thumbUrl}
                  alt={p.alt || "Photo sans description"}
                  width={p.width}
                  height={p.height}
                  className="aspect-[4/3] w-full object-cover"
                />
              </button>
              <div className="grid gap-2 p-3">
                <div className="flex flex-wrap items-center gap-1">
                  {p.isPublished ? <Badge tone="ok">publiée</Badge> : <Badge>brouillon</Badge>}
                </div>
                <p className="line-clamp-1 text-xs text-ivory-3">
                  {p.caption ?? p.event?.title ?? "Sans légende"}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" onClick={() => setEditing(p.id)}>
                    Modifier
                  </Button>
                  <ActionButton
                    action={setPhotoPublished}
                    input={{ id: p.id, publish: !p.isPublished }}
                    variant={p.isPublished ? "ghost" : "primary"}
                    success={p.isPublished ? "Photo retirée du site." : "Photo publiée."}
                  >
                    {p.isPublished ? "Dépublier" : "Publier"}
                  </ActionButton>
                  <ActionButton
                    action={deletePhoto}
                    input={{ id: p.id }}
                    variant="subtle"
                    confirm="Supprimer définitivement cette photo ?"
                    success="Photo supprimée."
                  >
                    Supprimer
                  </ActionButton>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
