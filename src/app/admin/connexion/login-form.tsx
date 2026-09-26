"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { buttonClass } from "@/components/admin/ui";
import { authClient } from "@/lib/auth-client";

type Step = "password" | "totp" | "backup";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("password");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    start(async () => {
      setError(null);
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        setError(
          res.error.status === 401
            ? "Identifiant ou mot de passe incorrect."
            : (res.error.message ?? "Connexion impossible."),
        );
        return;
      }
      if (res.data && "twoFactorRedirect" in res.data && res.data.twoFactorRedirect) {
        setStep("totp");
        return;
      }
      router.push("/admin");
      router.refresh();
    });
  }

  function onCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
    start(async () => {
      setError(null);
      const res =
        step === "totp"
          ? await authClient.twoFactor.verifyTotp({ code, trustDevice: false })
          : await authClient.twoFactor.verifyBackupCode({ code });
      if (res.error) {
        setError(res.error.message ?? "Code invalide.");
        return;
      }
      router.push("/admin");
      router.refresh();
    });
  }

  return (
    <div className="card p-6">
      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-s border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      {step === "password" ? (
        <form onSubmit={onPassword} className="grid gap-4">
          <div className="grid gap-1.5">
            <label htmlFor="email" className="label">
              Identifiant (e-mail)
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="field-input"
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="password" className="label">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="field-input"
            />
          </div>
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            {pending ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      ) : (
        <form onSubmit={onCode} className="grid gap-4">
          <div className="grid gap-1.5">
            <label htmlFor="code" className="label">
              {step === "totp" ? "Code de l'application d'authentification" : "Code de secours"}
            </label>
            <input
              id="code"
              name="code"
              inputMode={step === "totp" ? "numeric" : "text"}
              autoComplete="one-time-code"
              autoFocus
              required
              className="field-input text-center font-head text-lg tracking-[0.3em]"
            />
          </div>
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            {pending ? "Vérification…" : "Valider"}
          </button>
          <button
            type="button"
            className="text-xs text-ivory-3 hover:text-ivory"
            onClick={() => {
              setError(null);
              setStep(step === "totp" ? "backup" : "totp");
            }}
          >
            {step === "totp"
              ? "Utiliser un code de secours"
              : "Utiliser l'application d'authentification"}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-xs text-ivory-3">
        Accès réservé à l&apos;administrateur de l&apos;association. Après 5 échecs, le compte est
        verrouillé 15 minutes.
      </p>
    </div>
  );
}
