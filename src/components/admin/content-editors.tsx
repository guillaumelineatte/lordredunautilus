"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/lib/action-result";
import { formatAmount } from "@/lib/format";
import {
  deleteFaq,
  deletePlan,
  deleteTestimonial,
  reorderFaq,
  reorderGames,
  reorderPlans,
  reorderTestimonials,
  saveFaq,
  saveGame,
  savePlan,
  saveTestimonial,
} from "@/server/actions/content";
import { ActionButton } from "./action-button";
import {
  ActionForm,
  CheckboxField,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "./form";
import { useToast } from "./toast";
import { Badge, Button } from "./ui";

/** Liste réordonnable (flèches) avec édition dépliable de chaque élément. */
function SortableList<T extends { id: string }>({
  items,
  reorder,
  renderSummary,
  renderEditor,
}: {
  items: T[];
  reorder: (input: { ids: string[] }) => Promise<ActionResult<null>>;
  renderSummary: (item: T) => ReactNode;
  renderEditor: (item: T) => ReactNode;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [ids, setIds] = useState(items.map((i) => i.id));
  const [pending, start] = useTransition();
  const byId = new Map(items.map((i) => [i.id, i]));
  const list = [
    ...ids.map((id) => byId.get(id)).filter((i): i is T => Boolean(i)),
    ...items.filter((i) => !ids.includes(i.id)),
  ];
  const dirty = list.some((item, index) => items[index]?.id !== item.id);

  const move = (index: number, delta: number) => {
    const next = list.map((i) => i.id);
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(index + delta, 0, moved);
    setIds(next);
  };

  return (
    <div className="grid gap-2">
      {list.map((item, index) => (
        <details key={item.id} className="card">
          <summary className="flex cursor-pointer items-center gap-3 p-4">
            <span className="flex flex-col">
              <button
                type="button"
                aria-label="Monter"
                disabled={index === 0}
                onClick={(e) => {
                  e.preventDefault();
                  move(index, -1);
                }}
                className="text-xs text-ivory-3 hover:text-ivory disabled:opacity-20"
              >
                ▲
              </button>
              <button
                type="button"
                aria-label="Descendre"
                disabled={index === list.length - 1}
                onClick={(e) => {
                  e.preventDefault();
                  move(index, 1);
                }}
                className="text-xs text-ivory-3 hover:text-ivory disabled:opacity-20"
              >
                ▼
              </button>
            </span>
            <span className="min-w-0 flex-1">{renderSummary(item)}</span>
            <span className="text-xs text-rose">Modifier</span>
          </summary>
          <div className="border-t border-line p-4">{renderEditor(item)}</div>
        </details>
      ))}
      {dirty ? (
        <div className="flex justify-end">
          <Button
            variant="primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await reorder({ ids: list.map((i) => i.id) });
                if (!res.ok) notify(res.error, "error");
                else notify("Ordre enregistré.");
                router.refresh();
              })
            }
          >
            Enregistrer l&apos;ordre
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// ── Témoignages ────────────────────────────────────────────

type Testimonial = {
  id: string;
  quote: string;
  displayName: string;
  context: string;
  isPublished: boolean;
};

function TestimonialForm({ item }: { item?: Testimonial }) {
  return (
    <ActionForm
      action={saveTestimonial}
      success="Témoignage enregistré."
      extra={item ? { id: item.id } : undefined}
      resetOnSuccess={!item}
    >
      <TextAreaField
        label="Texte"
        name="quote"
        defaultValue={item?.quote}
        maxLength={600}
        rows={3}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <TextField
          label="Prénom affiché"
          name="displayName"
          defaultValue={item?.displayName}
          maxLength={40}
          hint="Prénom seul, avec l'accord de la personne."
        />
        <TextField
          label="Ancienneté ou jeu"
          name="context"
          defaultValue={item?.context}
          maxLength={80}
          placeholder="membre depuis 2025, Pokémon"
        />
      </div>
      <CheckboxField
        label="Publié sur le site"
        name="isPublished"
        defaultChecked={item?.isPublished ?? true}
      />
      <div className="flex justify-between gap-2">
        {item ? (
          <ActionButton
            action={deleteTestimonial}
            input={{ id: item.id }}
            variant="subtle"
            confirm="Supprimer ce témoignage ?"
          >
            Supprimer
          </ActionButton>
        ) : (
          <span />
        )}
        <SubmitButton>{item ? "Enregistrer" : "Ajouter le témoignage"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function TestimonialsEditor({ items }: { items: Testimonial[] }) {
  return (
    <div className="grid gap-6">
      <SortableList
        items={items}
        reorder={reorderTestimonials}
        renderSummary={(t) => (
          <>
            <span className="line-clamp-1 text-sm">« {t.quote} »</span>
            <span className="text-xs text-ivory-3">
              {t.displayName}, {t.context}{" "}
              {!t.isPublished ? <Badge className="ml-1">masqué</Badge> : null}
            </span>
          </>
        )}
        renderEditor={(t) => <TestimonialForm item={t} />}
      />
      <details className="card p-4">
        <summary
          className="cursor-pointer font-head text-sm tracking-[0.06em] text-rose"
          data-shortcut-target
        >
          Ajouter un témoignage
        </summary>
        <div className="mt-4">
          <TestimonialForm />
        </div>
      </details>
    </div>
  );
}

// ── FAQ ────────────────────────────────────────────────────

type Faq = { id: string; question: string; answer: string; isPublished: boolean };

function FaqForm({ item }: { item?: Faq }) {
  return (
    <ActionForm
      action={saveFaq}
      success="Question enregistrée."
      extra={item ? { id: item.id } : undefined}
      resetOnSuccess={!item}
    >
      <TextField label="Question" name="question" defaultValue={item?.question} maxLength={200} />
      <TextAreaField
        label="Réponse"
        name="answer"
        defaultValue={item?.answer}
        rows={5}
        hint="Markdown accepté : **gras**, listes, [liens](https://…)."
      />
      <CheckboxField
        label="Publiée sur le site"
        name="isPublished"
        defaultChecked={item?.isPublished ?? true}
      />
      <div className="flex justify-between gap-2">
        {item ? (
          <ActionButton
            action={deleteFaq}
            input={{ id: item.id }}
            variant="subtle"
            confirm="Supprimer cette question ?"
          >
            Supprimer
          </ActionButton>
        ) : (
          <span />
        )}
        <SubmitButton>{item ? "Enregistrer" : "Ajouter la question"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function FaqEditor({ items }: { items: Faq[] }) {
  return (
    <div className="grid gap-6">
      <SortableList
        items={items}
        reorder={reorderFaq}
        renderSummary={(f) => (
          <span className="text-sm">
            {f.question} {!f.isPublished ? <Badge className="ml-1">masquée</Badge> : null}
          </span>
        )}
        renderEditor={(f) => <FaqForm item={f} />}
      />
      <details className="card p-4">
        <summary className="cursor-pointer font-head text-sm tracking-[0.06em] text-rose">
          Ajouter une question
        </summary>
        <div className="mt-4">
          <FaqForm />
        </div>
      </details>
    </div>
  );
}

// ── Formules ───────────────────────────────────────────────

type Plan = {
  id: string;
  name: string;
  kind: "DISCOVERY" | "MEMBERSHIP";
  priceCents: number;
  reducedPriceCents: number | null;
  periodLabel: string;
  durationDays: number | null;
  benefits: string[];
  isFeatured: boolean;
  isActive: boolean;
  memberships: number;
};

function PlanForm({ item }: { item?: Plan }) {
  const [kind, setKind] = useState(item?.kind ?? "MEMBERSHIP");
  return (
    <ActionForm
      action={savePlan}
      success="Formule enregistrée."
      extra={item ? { id: item.id } : undefined}
      resetOnSuccess={!item}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <TextField label="Nom" name="name" defaultValue={item?.name} maxLength={60} />
        <SelectField
          label="Type"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as Plan["kind"])}
          options={[
            { value: "MEMBERSHIP", label: "Adhésion (enregistrable)" },
            { value: "DISCOVERY", label: "Découverte (carte d'information seule)" },
          ]}
        />
        <TextField
          label="Prix (€)"
          name="price"
          inputMode="decimal"
          defaultValue={item ? formatAmount(item.priceCents) : ""}
        />
        <TextField
          label="Tarif réduit (€, facultatif)"
          name="reducedPrice"
          inputMode="decimal"
          defaultValue={item?.reducedPriceCents != null ? formatAmount(item.reducedPriceCents) : ""}
        />
        <TextField
          label="Période affichée"
          name="periodLabel"
          defaultValue={item?.periodLabel ?? "par an"}
          maxLength={40}
        />
        {kind === "MEMBERSHIP" ? (
          <TextField
            label="Durée (jours)"
            name="durationDays"
            type="number"
            defaultValue={item?.durationDays ?? 365}
          />
        ) : (
          <span />
        )}
      </div>
      <TextAreaField
        label="Avantages (un par ligne)"
        name="benefits"
        defaultValue={item?.benefits.join("\n")}
        rows={5}
      />
      <div className="flex flex-wrap gap-6">
        <CheckboxField
          label="Mise en avant (« Le plus choisi »)"
          name="isFeatured"
          defaultChecked={item?.isFeatured}
        />
        <CheckboxField
          label="Active (visible et enregistrable)"
          name="isActive"
          defaultChecked={item?.isActive ?? true}
        />
      </div>
      <div className="flex justify-between gap-2">
        {item ? (
          <ActionButton
            action={deletePlan}
            input={{ id: item.id }}
            variant="subtle"
            confirm="Supprimer cette formule ?"
            disabled={item.memberships > 0}
            title={
              item.memberships > 0
                ? "Utilisée par des adhésions : désactivez-la plutôt."
                : undefined
            }
          >
            Supprimer
          </ActionButton>
        ) : (
          <span />
        )}
        <SubmitButton>{item ? "Enregistrer" : "Ajouter la formule"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function PlansEditor({ items }: { items: Plan[] }) {
  return (
    <div className="grid gap-6">
      <SortableList
        items={items}
        reorder={reorderPlans}
        renderSummary={(p) => (
          <span className="flex flex-wrap items-center gap-2 text-sm">
            <b className="font-semibold">{p.name}</b> {formatAmount(p.priceCents)} € ·{" "}
            {p.periodLabel}
            {p.kind === "DISCOVERY" ? <Badge>découverte</Badge> : null}
            {p.isFeatured ? <Badge tone="rose">mise en avant</Badge> : null}
            {!p.isActive ? <Badge tone="warn">inactive</Badge> : null}
            <span className="text-xs text-ivory-3">{p.memberships} adhésion(s)</span>
          </span>
        )}
        renderEditor={(p) => <PlanForm item={p} />}
      />
      <details className="card p-4">
        <summary className="cursor-pointer font-head text-sm tracking-[0.06em] text-rose">
          Ajouter une formule
        </summary>
        <div className="mt-4">
          <PlanForm />
        </div>
      </details>
    </div>
  );
}

// ── Jeux ───────────────────────────────────────────────────

type Game = {
  id: string;
  name: string;
  publisher: string;
  sigil: string;
  accentColor: string;
  usualDay: string;
  levels: string;
  formats: string[];
  playerIdLabel: string;
  playerIdPattern: string | null;
  playerIdExample: string | null;
  isActive: boolean;
};

function GameForm({ item }: { item?: Game }) {
  return (
    <ActionForm
      action={saveGame}
      success="Jeu enregistré."
      extra={item ? { id: item.id } : undefined}
      resetOnSuccess={!item}
    >
      <div className="grid gap-3 md:grid-cols-3">
        <TextField label="Nom" name="name" defaultValue={item?.name} className="md:col-span-2" />
        <TextField label="Éditeur" name="publisher" defaultValue={item?.publisher} />
        <TextField label="Lettre (sigle)" name="sigil" defaultValue={item?.sigil} maxLength={2} />
        <TextField
          label="Couleur d'accent"
          name="accentColor"
          type="color"
          defaultValue={item?.accentColor ?? "#2A4F73"}
          className="[&_input]:h-10 [&_input]:p-1"
        />
        <TextField
          label="Jour habituel"
          name="usualDay"
          defaultValue={item?.usualDay}
          placeholder="Vendredi"
        />
        <TextField
          label="Niveaux"
          name="levels"
          defaultValue={item?.levels}
          placeholder="Débutant à compétitif"
        />
        <TextField
          label="Formats (séparés par des virgules)"
          name="formats"
          defaultValue={item?.formats.join(", ")}
          className="md:col-span-2"
        />
        <TextField
          label="Libellé de l'identifiant"
          name="playerIdLabel"
          defaultValue={item?.playerIdLabel}
          placeholder="Konami ID"
        />
        <TextField
          label="Format attendu (expression régulière)"
          name="playerIdPattern"
          defaultValue={item?.playerIdPattern ?? ""}
          placeholder="\d{10}"
          hint="Vide = aucun contrôle."
        />
        <TextField
          label="Exemple affiché"
          name="playerIdExample"
          defaultValue={item?.playerIdExample ?? ""}
        />
      </div>
      <CheckboxField
        label="Actif (affiché sur le site et proposé dans les formulaires)"
        name="isActive"
        defaultChecked={item?.isActive ?? true}
      />
      <div className="flex justify-end">
        <SubmitButton>{item ? "Enregistrer" : "Ajouter le jeu"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function GamesEditor({ items }: { items: Game[] }) {
  return (
    <div className="grid gap-6">
      <SortableList
        items={items}
        reorder={reorderGames}
        renderSummary={(g) => (
          <span className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className="grid size-7 place-items-center rounded-full border border-line-strong font-head text-rose"
              style={{ background: `${g.accentColor}55` }}
            >
              {g.sigil}
            </span>
            <b className="font-semibold">{g.name}</b>
            <span className="text-ivory-3">
              {g.usualDay} · {g.playerIdLabel}
            </span>
            {!g.isActive ? <Badge tone="warn">inactif</Badge> : null}
          </span>
        )}
        renderEditor={(g) => <GameForm item={g} />}
      />
      <details className="card p-4">
        <summary className="cursor-pointer font-head text-sm tracking-[0.06em] text-rose">
          Ajouter un jeu
        </summary>
        <div className="mt-4">
          <GameForm />
        </div>
      </details>
    </div>
  );
}
