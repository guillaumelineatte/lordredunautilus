"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { PencilIcon } from "./icons";
import { MemberForm, type MemberFormValues } from "./member-form";
import { Button, Card } from "./ui";

type Game = {
  id: string;
  name: string;
  playerIdLabel: string;
  playerIdPattern: string | null;
  playerIdExample: string | null;
};

// Fiche en lecture, le bouton Modifier bascule sur le formulaire.
export function MemberSheet({
  games,
  values,
  summary,
  startEditing = false,
}: {
  games: Game[];
  values: MemberFormValues;
  summary: ReactNode; // rendu côté serveur
  startEditing?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [editing, setEditing] = useState(startEditing);
  const close = () => {
    setEditing(false);
    // ouverte depuis la liste avec ?modifier=1, on nettoie l'url
    if (startEditing) router.replace(pathname, { scroll: false });
  };

  if (editing) {
    return (
      <section aria-labelledby="edit-title" className="grid gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="edit-title" className="text-lg">
            Modifier les paramètres
          </h2>
        </div>
        <MemberForm games={games} initial={values} onDone={close} onCancel={close} />
      </section>
    );
  }

  return (
    <Card
      title="Paramètres de l'adhérent"
      actions={
        <Button variant="primary" size="sm" onClick={() => setEditing(true)}>
          <PencilIcon className="size-3.5 shrink-0" />
          Modifier
        </Button>
      }
    >
      {summary}
    </Card>
  );
}
