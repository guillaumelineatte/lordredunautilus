"use client";

import { useState, useTransition, type FormEvent } from "react";
import { matchesPattern } from "@/lib/text";
import { registerForEvent } from "@/server/actions/public";

type Props = {
  eventId: string;
  full: boolean;
  requirePlayerId: boolean;
  game: {
    name: string;
    playerIdLabel: string;
    playerIdPattern: string | null;
    playerIdExample: string | null;
  } | null;
};

type Errors = Partial<Record<"firstName" | "lastName" | "playerId" | "email", string>>;

/** Inscription sans compte : prénom, nom, identifiant de jeu, e-mail facultatif. */
export function RegistrationForm({ eventId, full, requirePlayerId, game }: Props) {
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<{
    status: "REGISTERED" | "WAITLISTED";
    emailSent: boolean;
  } | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const get = (k: string) => String(data.get(k) ?? "").trim();
    const next: Errors = {};
    if (!get("firstName")) next.firstName = "Indiquez votre prénom.";
    if (!get("lastName")) next.lastName = "Indiquez votre nom.";
    if (game) {
      const pid = get("playerId");
      if (!pid && requirePlayerId) next.playerId = `Indiquez votre ${game.playerIdLabel}.`;
      else if (pid && !matchesPattern(pid, game.playerIdPattern)) {
        next.playerId = `Format attendu${game.playerIdExample ? ` : ${game.playerIdExample}` : " invalide"}.`;
      }
    }
    const email = get("email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Cette adresse e-mail n’est pas valide.";
    setErrors(next);
    if (Object.keys(next).length) return;
    data.set("eventId", eventId);
    start(async () => {
      const res = await registerForEvent(data);
      if (!res.ok) {
        setFailure(res.error);
        setErrors((res.fieldErrors ?? {}) as Errors);
        return;
      }
      setFailure(null);
      setDone(res.data);
    });
  }

  if (done) {
    return (
      <div className="form-ok" role="status">
        <b>
          {done.status === "WAITLISTED"
            ? "Vous êtes sur liste d'attente"
            : "C'est noté, à bientôt !"}
        </b>
        {done.status === "WAITLISTED"
          ? "L'événement est complet : si une place se libère, l'équipe vous préviendra."
          : "Votre place est réservée."}{" "}
        {done.emailSent
          ? "Un e-mail de confirmation vient de partir, avec un lien pour annuler si besoin."
          : "Un empêchement ? Prévenez-nous sur Discord ou via le formulaire de contact."}
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit}>
      {failure ? (
        <p className="form-error" role="alert">
          {failure}
        </p>
      ) : null}
      <div className="row">
        <div className="field">
          <label htmlFor="r-first">Prénom</label>
          <input
            id="r-first"
            name="firstName"
            autoComplete="given-name"
            required
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby="r-first-err"
          />
          <span className="err" id="r-first-err">
            {errors.firstName}
          </span>
        </div>
        <div className="field">
          <label htmlFor="r-last">Nom</label>
          <input
            id="r-last"
            name="lastName"
            autoComplete="family-name"
            required
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby="r-last-err"
          />
          <span className="err" id="r-last-err">
            {errors.lastName}
          </span>
        </div>
      </div>
      {game ? (
        <div className="field">
          <label htmlFor="r-pid">
            {game.playerIdLabel}
            {requirePlayerId ? "" : " (facultatif)"}
          </label>
          <input
            id="r-pid"
            name="playerId"
            placeholder={game.playerIdExample ?? ""}
            autoComplete="off"
            aria-invalid={Boolean(errors.playerId)}
            aria-describedby="r-pid-err"
          />
          <span className="err" id="r-pid-err">
            {errors.playerId}
          </span>
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="r-mail">E-mail (facultatif)</label>
        <input
          id="r-mail"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby="r-mail-hint"
        />
        <span className="hint" id="r-mail-hint">
          {errors.email ?? "Uniquement pour vous confirmer la place, effacé après la soirée."}
        </span>
      </div>
      <p className="notice" role="note">
        <strong>Moins de 16 ans ?</strong> Un adulte doit t&apos;accompagner pendant toute la
        soirée. Les tournois avec dotation suivent les règles d&apos;âge de chaque éditeur.
      </p>
      <div className="hp" aria-hidden="true">
        <label htmlFor="r-website">Ne pas remplir</label>
        <input id="r-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <button className="btn btn-primary magnetic" type="submit" disabled={pending}>
        {pending ? "Envoi…" : full ? "M'inscrire en liste d'attente" : "Réserver ma place"}
      </button>
    </form>
  );
}
