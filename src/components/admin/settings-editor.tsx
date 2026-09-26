"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import type { SettingKey, Settings } from "@/lib/settings";
import { saveSetting } from "@/server/actions/content";
import { useToast } from "./toast";
import { Button, Card } from "./ui";

function useSave<K extends SettingKey>(key: K) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, start] = useTransition();
  const save = (value: Settings[K]) =>
    start(async () => {
      const res = await saveSetting({ key, value });
      if (!res.ok) notify(res.error, "error");
      else notify("Réglage enregistré. Le site est mis à jour.");
      router.refresh();
    });
  return { save, pending };
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="label">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
      />
      {hint ? <span className="text-xs text-ivory-3">{hint}</span> : null}
    </label>
  );
}

function Section<K extends SettingKey>({
  title,
  settingKey,
  initial,
  children,
  description,
}: {
  title: string;
  settingKey: K;
  initial: Settings[K];
  description?: string;
  children: (value: Settings[K], set: (v: Settings[K]) => void) => ReactNode;
}) {
  const [value, setValue] = useState(initial);
  const { save, pending } = useSave(settingKey);
  return (
    <Card title={title}>
      {description ? <p className="-mt-2 mb-4 text-sm text-ivory-3">{description}</p> : null}
      <div className="grid gap-3">{children(value, setValue)}</div>
      <div className="mt-4 flex justify-end">
        <Button variant="primary" disabled={pending} onClick={() => save(value)}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </Card>
  );
}

export function SettingsEditor({ settings }: { settings: Settings }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Adresse du local" settingKey="address" initial={settings.address}>
        {(v, set) => (
          <>
            <Input label="Nom du lieu" value={v.venue} onChange={(venue) => set({ ...v, venue })} />
            <Input label="Rue" value={v.street} onChange={(street) => set({ ...v, street })} />
            <div className="grid grid-cols-[8rem_1fr] gap-3">
              <Input
                label="Code postal"
                value={v.postalCode}
                onChange={(postalCode) => set({ ...v, postalCode })}
              />
              <Input label="Ville" value={v.city} onChange={(city) => set({ ...v, city })} />
            </div>
            <Input
              label="Lien vers un plan (facultatif)"
              value={v.mapUrl}
              onChange={(mapUrl) => set({ ...v, mapUrl })}
              hint="Ex. lien OpenStreetMap ou Google Maps, ouvert dans un nouvel onglet."
            />
          </>
        )}
      </Section>

      <Section title="Horaires" settingKey="hours" initial={settings.hours}>
        {(v, set) => (
          <>
            {v.map((h, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <Input
                  label="Jour"
                  value={h.label}
                  onChange={(label) => set(v.map((x, j) => (j === i ? { ...x, label } : x)))}
                />
                <Input
                  label="Horaire"
                  value={h.value}
                  onChange={(value) => set(v.map((x, j) => (j === i ? { ...x, value } : x)))}
                />
                <Button variant="subtle" size="sm" onClick={() => set(v.filter((_, j) => j !== i))}>
                  Retirer
                </Button>
              </div>
            ))}
            <div>
              <Button size="sm" onClick={() => set([...v, { label: "", value: "" }])}>
                + Ajouter une ligne
              </Button>
            </div>
          </>
        )}
      </Section>

      <Section
        title="Adhésion via PayPal"
        settingKey="paypal"
        initial={settings.paypal}
        description="Affiché sur la page « Adhérer » : les membres envoient le montant à cette adresse."
      >
        {(v, set) => (
          <>
            <Input
              label="Adresse PayPal (e-mail du compte de l'association)"
              value={v.address}
              onChange={(address) => set({ ...v, address })}
            />
            <Input
              label="Lien PayPal.me (facultatif)"
              value={v.link}
              onChange={(link) => set({ ...v, link })}
              hint="https://paypal.me/…"
            />
          </>
        )}
      </Section>

      <Section
        title="Note sous les formules"
        settingKey="membershipNote"
        initial={settings.membershipNote}
      >
        {(v, set) => (
          <textarea
            value={v}
            onChange={(e) => set(e.target.value)}
            rows={3}
            className="field-input"
            aria-label="Note sous les formules"
          />
        )}
      </Section>

      <Section
        title="E-mail de contact"
        settingKey="contactEmail"
        initial={settings.contactEmail}
        description="Affiché sur le site et utilisé pour l'exercice des droits RGPD."
      >
        {(v, set) => <Input label="E-mail" type="email" value={v} onChange={set} />}
      </Section>

      <Section title="Réseaux" settingKey="socials" initial={settings.socials}>
        {(v, set) => (
          <>
            <Input
              label="Discord (lien d'invitation)"
              value={v.discord}
              onChange={(discord) => set({ ...v, discord })}
            />
            <Input
              label="Instagram"
              value={v.instagram}
              onChange={(instagram) => set({ ...v, instagram })}
            />
            <Input
              label="Facebook"
              value={v.facebook}
              onChange={(facebook) => set({ ...v, facebook })}
            />
          </>
        )}
      </Section>

      <Section
        title="Chiffres clés"
        settingKey="stats"
        initial={settings.stats}
        description="« Automatique » calcule la valeur depuis la base (membres actifs) ou les réglages (année de fondation)."
      >
        {(v, set) =>
          v.map((s, i) => (
            <div key={i} className="grid grid-cols-[6rem_1fr_10rem] items-end gap-2">
              <Input
                label="Valeur"
                type="number"
                value={String(s.value)}
                onChange={(x) =>
                  set(v.map((y, j) => (j === i ? { ...y, value: Number(x) || 0 } : y)))
                }
              />
              <Input
                label="Libellé"
                value={s.label}
                onChange={(label) => set(v.map((y, j) => (j === i ? { ...y, label } : y)))}
              />
              <label className="grid gap-1.5">
                <span className="label">Source</span>
                <select
                  value={s.auto}
                  onChange={(e) =>
                    set(
                      v.map((y, j) =>
                        j === i ? { ...y, auto: e.target.value as typeof s.auto } : y,
                      ),
                    )
                  }
                  className="field-input"
                >
                  <option value="none">Saisie</option>
                  <option value="activeMembers">Auto : membres actifs</option>
                  <option value="foundedYear">Auto : fondation</option>
                </select>
              </label>
            </div>
          ))
        }
      </Section>

      <Section title="Année de fondation" settingKey="foundedYear" initial={settings.foundedYear}>
        {(v, set) => (
          <Input
            label="Année"
            type="number"
            value={String(v)}
            onChange={(x) => set(Number(x) || v)}
          />
        )}
      </Section>

      <Section title="Mentions légales" settingKey="legal" initial={settings.legal}>
        {(v, set) => (
          <>
            <Input
              label="Nom de l'association"
              value={v.associationName}
              onChange={(associationName) => set({ ...v, associationName })}
            />
            <Input label="Numéro RNA" value={v.rna} onChange={(rna) => set({ ...v, rna })} />
            <Input
              label="Siège social"
              value={v.siege}
              onChange={(siege) => set({ ...v, siege })}
            />
            <Input
              label="Président·e (responsable de traitement)"
              value={v.president}
              onChange={(president) => set({ ...v, president })}
            />
            <Input
              label="Directeur·rice de la publication"
              value={v.publicationDirector}
              onChange={(publicationDirector) => set({ ...v, publicationDirector })}
            />
            <Input
              label="Hébergeur"
              value={v.hostName}
              onChange={(hostName) => set({ ...v, hostName })}
            />
            <Input
              label="Adresse de l'hébergeur"
              value={v.hostAddress}
              onChange={(hostAddress) => set({ ...v, hostAddress })}
            />
          </>
        )}
      </Section>

      <Section
        title="Confidentialité : texte complémentaire"
        settingKey="privacyExtra"
        initial={settings.privacyExtra}
        description="Ajouté en fin de page confidentialité (markdown). Les sections obligatoires sont générées automatiquement."
      >
        {(v, set) => (
          <textarea
            value={v}
            onChange={(e) => set(e.target.value)}
            rows={6}
            className="field-input"
            aria-label="Texte complémentaire"
          />
        )}
      </Section>

      <Section title="Options" settingKey="features" initial={settings.features}>
        {(v, set) => (
          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={v.discordWebhook}
              onChange={(e) => set({ ...v, discordWebhook: e.target.checked })}
              className="mt-0.5 size-4 accent-rose"
            />
            <span>
              Annoncer automatiquement les événements publiés sur Discord
              <span className="block text-xs text-ivory-3">
                Nécessite la variable d&apos;environnement DISCORD_WEBHOOK_URL.
              </span>
            </span>
          </label>
        )}
      </Section>
    </div>
  );
}
