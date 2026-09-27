import type { Metadata } from "next";
import { ActionButton } from "@/components/admin/action-button";
import { Badge, Card, DefinitionList, PageHeader } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";
import { revokeOtherSessions, revokeSession } from "@/server/actions/account";
import { adminAccessUrl } from "@/server/auth/admin-gate";
import { requireAdminPage } from "@/server/auth/session";
import { env } from "@/server/env";
import { accountData } from "@/server/queries/admin";
import { PasswordForm, TwoFactorPanel } from "./account-forms";

export const metadata: Metadata = { title: "Mon compte" };

function device(ua: string | null) {
  if (!ua) return "Navigateur inconnu";
  const browser = /Firefox\//.test(ua)
    ? "Firefox"
    : /Edg\//.test(ua)
      ? "Edge"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Navigateur";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return `${browser}${os ? ` sur ${os}` : ""}`;
}

export default async function AccountPage() {
  const session = await requireAdminPage();
  const { user, sessions } = await accountData(session.user.id);
  const twoFactor = Boolean(user?.twoFactorEnabled);
  const accessUrl = adminAccessUrl(env.NEXT_PUBLIC_SITE_URL);

  return (
    <>
      <PageHeader
        kicker="Mon compte"
        title="Compte administrateur"
        description="Un seul compte, qui a tous les droits."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Identité">
          <DefinitionList
            items={[
              ["Identifiant", user?.email ?? "—"],
              ["Dernière connexion", formatDateTime(user?.lastLoginAt ?? null)],
              [
                "Double authentification",
                twoFactor ? (
                  <Badge tone="ok">activée</Badge>
                ) : (
                  <Badge tone="warn">désactivée</Badge>
                ),
              ],
            ]}
          />
        </Card>
        <Card title="Adresse d'accès à l'administration">
          <p className="mb-3 text-sm text-ivory-2">
            L&apos;administration n&apos;est joignable qu&apos;en passant d&apos;abord par cette
            adresse secrète : sans elle, toutes ses pages et l&apos;API de connexion répondent «
            page introuvable ». Gardez-la en favori et ne la partagez pas.
          </p>
          {accessUrl ? (
            <code className="block rounded-s border border-line-strong bg-abyss/60 px-3 py-2 text-sm break-all">
              {accessUrl}
            </code>
          ) : null}
          <p className="mt-3 text-xs text-ivory-3">
            Le passage par cette adresse est mémorisé 400 jours sur ce navigateur. Pour la changer,
            modifiez la variable ADMIN_ACCESS_CODE (voir README).
          </p>
        </Card>
        <Card title="Mot de passe">
          <PasswordForm />
        </Card>
        <Card title="Double authentification (TOTP)">
          <TwoFactorPanel enabled={twoFactor} />
        </Card>
        <Card
          title="Sessions actives"
          actions={
            sessions.length > 1 ? (
              <ActionButton
                action={revokeOtherSessions}
                input={{}}
                confirm="Déconnecter tous les autres appareils ?"
                success="Autres sessions fermées."
              >
                Déconnecter les autres
              </ActionButton>
            ) : null
          }
        >
          <ul className="divide-y divide-line text-sm">
            {sessions.map((s) => {
              const current = s.id === session.session.id;
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <p>
                      {device(s.userAgent)}{" "}
                      {current ? <Badge tone="ok">cette session</Badge> : null}
                    </p>
                    <p className="text-xs text-ivory-3">
                      {s.ipAddress ?? "IP inconnue"} · ouverte le {formatDateTime(s.createdAt)} ·
                      active le {formatDateTime(s.updatedAt)}
                    </p>
                  </div>
                  {!current ? (
                    <ActionButton
                      action={revokeSession}
                      input={{ id: s.id }}
                      variant="subtle"
                      success="Session fermée."
                    >
                      Révoquer
                    </ActionButton>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
