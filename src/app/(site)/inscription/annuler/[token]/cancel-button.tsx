"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cancelRegistration } from "@/server/actions/public";

export function CancelButton({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (result) {
    return (
      <>
        <div className={result.ok ? "form-ok" : "form-error"} role="status">
          {result.ok ? <b>Inscription annulée</b> : null}
          {result.message}
        </div>
        <Link className="btn btn-ghost" href="/evenements">
          Voir l&apos;agenda
        </Link>
      </>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-primary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await cancelRegistration(token);
          setResult(
            res.ok
              ? {
                  ok: true,
                  message: `Votre place pour « ${res.data.eventTitle} » est libérée. Merci d'avoir prévenu !`,
                }
              : { ok: false, message: res.error },
          );
        })
      }
    >
      {pending ? "Annulation…" : "Confirmer l'annulation"}
    </button>
  );
}
