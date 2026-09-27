"use client";

import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useState, useTransition, type FormEvent } from "react";
import { useToast } from "@/components/admin/toast";
import { buttonClass } from "@/components/admin/ui";
import { authClient } from "@/lib/auth-client";

function Input({
  label,
  name,
  type = "password",
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="label">{label}</span>
      <input name={name} type={type} autoComplete={autoComplete} required className="field-input" />
    </label>
  );
}

export function PasswordForm() {
  const { notify } = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("current"));
    const newPassword = String(data.get("next"));
    if (newPassword !== String(data.get("confirm"))) {
      setError("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 12) {
      setError("Le nouveau mot de passe doit contenir au moins 12 caractères.");
      return;
    }
    start(async () => {
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (res.error) {
        setError(res.error.message ?? "Mot de passe actuel incorrect.");
        return;
      }
      setError(null);
      form.reset();
      notify("Mot de passe modifié. Les autres sessions ont été fermées.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      {error ? (
        <p className="rounded-s border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Input label="Mot de passe actuel" name="current" autoComplete="current-password" />
      <Input
        label="Nouveau mot de passe (12 caractères minimum)"
        name="next"
        autoComplete="new-password"
      />
      <Input label="Confirmer le nouveau mot de passe" name="confirm" autoComplete="new-password" />
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Modification…" : "Changer le mot de passe"}
        </button>
      </div>
    </form>
  );
}

export function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState<{ qr: string; uri: string; backupCodes: string[] } | null>(
    null,
  );
  const [codes, setCodes] = useState<string[] | null>(null);

  function enable(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    start(async () => {
      const res = await authClient.twoFactor.enable({ password });
      if (res.error || !res.data || !("totpURI" in res.data)) {
        setError(res.error?.message ?? "Mot de passe incorrect.");
        return;
      }
      setError(null);
      const qr = await QRCode.toDataURL(res.data.totpURI, {
        margin: 1,
        width: 220,
        color: { dark: "#0C1826", light: "#F3EFE7" },
      });
      setSetup({ qr, uri: res.data.totpURI, backupCodes: res.data.backupCodes });
    });
  }

  function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code")).replace(/\s/g, "");
    start(async () => {
      const res = await authClient.twoFactor.verifyTotp({ code });
      if (res.error) {
        setError(res.error.message ?? "Code invalide.");
        return;
      }
      setError(null);
      setSetup(null);
      notify("Double authentification activée.");
      router.refresh();
    });
  }

  function disable(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    start(async () => {
      const res = await authClient.twoFactor.disable({ password });
      if (res.error) {
        setError(res.error.message ?? "Mot de passe incorrect.");
        return;
      }
      setError(null);
      notify("Double authentification désactivée.");
      router.refresh();
    });
  }

  function regenerate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    start(async () => {
      const res = await authClient.twoFactor.generateBackupCodes({ password });
      if (res.error || !res.data) {
        setError(res.error?.message ?? "Mot de passe incorrect.");
        return;
      }
      setError(null);
      setCodes(res.data.backupCodes);
    });
  }

  const errorBox = error ? (
    <p className="rounded-s border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
      {error}
    </p>
  ) : null;
  const codesBox = (list: string[]) => (
    <div className="rounded-s border border-line-strong p-3">
      <p className="mb-2 text-xs text-ivory-2">
        Codes de secours à usage unique — conservez-les hors ligne (papier, coffre-fort de mots de
        passe) :
      </p>
      <ul className="grid grid-cols-2 gap-1 font-mono text-sm">
        {list.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  );

  if (setup) {
    return (
      <div className="grid gap-4">
        {errorBox}
        <p className="text-sm text-ivory-2">
          Scannez ce QR code avec votre application (Aegis, 2FAS, Google Authenticator…), puis
          saisissez le code affiché.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={setup.qr}
          alt="QR code de configuration de la double authentification"
          width={220}
          height={220}
          className="rounded-s"
        />
        <details className="text-xs text-ivory-3">
          <summary className="cursor-pointer">Saisie manuelle</summary>
          <code className="break-all">{setup.uri}</code>
        </details>
        {codesBox(setup.backupCodes)}
        <form onSubmit={verify} className="grid gap-3">
          <Input label="Code à 6 chiffres" name="code" type="text" autoComplete="one-time-code" />
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            Confirmer l&apos;activation
          </button>
        </form>
      </div>
    );
  }

  if (!enabled) {
    return (
      <form onSubmit={enable} className="grid gap-3">
        {errorBox}
        <p className="text-sm text-ivory-2">
          Recommandé : un code temporaire sera demandé à chaque connexion, en plus du mot de passe.
        </p>
        <Input label="Mot de passe" name="password" autoComplete="current-password" />
        <div className="flex justify-end">
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            Activer la double authentification
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="grid gap-5">
      {errorBox}
      {codes ? codesBox(codes) : null}
      <form onSubmit={regenerate} className="grid gap-3">
        <Input
          label="Mot de passe (pour générer de nouveaux codes de secours)"
          name="password"
          autoComplete="current-password"
        />
        <button type="submit" disabled={pending} className={buttonClass("ghost")}>
          Générer de nouveaux codes de secours
        </button>
      </form>
      <form onSubmit={disable} className="grid gap-3 border-t border-line pt-4">
        <Input
          label="Mot de passe (pour désactiver)"
          name="password"
          autoComplete="current-password"
        />
        <button type="submit" disabled={pending} className={buttonClass("danger")}>
          Désactiver la double authentification
        </button>
      </form>
    </div>
  );
}
