"use client";

import { useState, useTransition, type FormEvent } from "react";
import { sendContactMessage } from "@/server/actions/public";

type Errors = Partial<Record<"firstName" | "email" | "message", string>>;

export function ContactForm({ games }: { games: string[] }) {
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const firstName = String(data.get("firstName") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const next: Errors = {};
    if (firstName.length < 2) next.firstName = "Indiquez votre prénom.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Cette adresse e-mail n’est pas valide.";
    if (message.length < 6) next.message = "Dites-nous en un peu plus.";
    setErrors(next);
    if (Object.keys(next).length) return;
    start(async () => {
      const res = await sendContactMessage(data);
      if (!res.ok) {
        setFailure(res.error);
        setErrors((res.fieldErrors ?? {}) as Errors);
        return;
      }
      setSentTo(res.data.email);
    });
  }

  if (sentTo) {
    return (
      <div className="form-ok" role="status">
        <b>Message envoyé</b>On vous répond sous 48 h à {sentTo}. À très vite au local.
      </div>
    );
  }

  return (
    <form id="contactform" noValidate onSubmit={onSubmit}>
      {failure ? (
        <p className="form-error" role="alert">
          {failure}
        </p>
      ) : null}
      <div className="row">
        <div className="field">
          <label htmlFor="f-name">Prénom</label>
          <input
            id="f-name"
            name="firstName"
            autoComplete="given-name"
            required
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby="f-name-err"
          />
          <span className="err" id="f-name-err">
            {errors.firstName}
          </span>
        </div>
        <div className="field">
          <label htmlFor="f-mail">E-mail</label>
          <input
            id="f-mail"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(errors.email)}
            aria-describedby="f-mail-err"
          />
          <span className="err" id="f-mail-err">
            {errors.email}
          </span>
        </div>
      </div>
      <div className="field">
        <label htmlFor="f-game">Le jeu qui vous intéresse</label>
        <select id="f-game" name="game" defaultValue="">
          <option value="">Je ne sais pas encore</option>
          {games.map((g) => (
            <option key={g}>{g}</option>
          ))}
          <option>Un autre jeu</option>
        </select>
        <span className="err" />
      </div>
      <div className="field">
        <label htmlFor="f-msg">Votre message</label>
        <textarea
          id="f-msg"
          name="message"
          required
          placeholder="Une question, une envie de venir un soir, un jeu à proposer…"
          aria-invalid={Boolean(errors.message)}
          aria-describedby="f-msg-err"
        />
        <span className="err" id="f-msg-err">
          {errors.message}
        </span>
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor="f-website">Ne pas remplir</label>
        <input id="f-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <p className="hint" style={{ fontSize: ".85rem", color: "var(--ivory-3)" }}>
        Votre message et votre adresse servent uniquement à vous répondre ; ils sont supprimés 6
        mois après traitement.
      </p>
      <button className="btn btn-primary magnetic" type="submit" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer le message"}
      </button>
    </form>
  );
}
