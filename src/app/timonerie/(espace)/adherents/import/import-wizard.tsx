"use client";

import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/admin/toast";
import { Button, Card } from "@/components/admin/ui";
import { IMPORTABLE_FIELDS, importableFieldLabel } from "@/lib/import-fields";
import { normalize } from "@/lib/text";
import { importMembers } from "@/server/actions/import";

type Game = { slug: string; name: string; label: string };

// devine le champ à partir du nom de la colonne
function guess(header: string, games: Game[]): string {
  const h = normalize(header);
  if (/^(prenom|first ?name)/.test(h)) return "firstName";
  if (/^(nom|last ?name|surname)/.test(h)) return "lastName";
  if (/(carte|card)/.test(h)) return "cardNumber";
  if (/(note|remarque)/.test(h)) return "notes";
  const g = games.find(
    (game) => h.includes(normalize(game.name)) || h.includes(normalize(game.label)),
  );
  return g ? `game:${g.slug}` : "";
}

export function ImportWizard({ games }: { games: Game[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const [csv, setCsv] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ created: number; skipped: string[] } | null>(null);
  const [pending, start] = useTransition();

  const targets = [
    ...IMPORTABLE_FIELDS.map((f) => ({ value: f, label: importableFieldLabel[f] })),
    ...games.map((g) => ({ value: `game:${g.slug}`, label: `${g.label} (${g.name})` })),
  ];

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
    });
    const cols = parsed.meta.fields ?? [];
    setCsv(text);
    setHeaders(cols);
    setPreview(parsed.data);
    setMapping(Object.fromEntries(cols.map((c) => [c, guess(c, games)])));
    setResult(null);
  }

  const mapped = Object.values(mapping);
  const ready = csv && mapped.includes("firstName") && mapped.includes("lastName");

  return (
    <div className="grid gap-6">
      <Card title="1. Choisir le fichier">
        <input
          type="file"
          accept=".csv,text/csv"
          aria-label="Fichier CSV"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="field-input file:mr-3 file:rounded-full file:border-0 file:bg-surface-2 file:px-3 file:py-1 file:text-ivory"
        />
        <p className="mt-2 text-xs text-ivory-3">
          Séparateur virgule ou point-virgule, première ligne = intitulés des colonnes, encodage
          UTF-8.
        </p>
      </Card>

      {headers.length > 0 ? (
        <Card title="2. Associer les colonnes">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Colonne du fichier</th>
                  <th>Exemple</th>
                  <th>Champ de destination</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((h) => (
                  <tr key={h}>
                    <td className="font-semibold">{h}</td>
                    <td className="max-w-48 truncate text-ivory-3">{preview[0]?.[h] ?? ""}</td>
                    <td>
                      <select
                        aria-label={`Destination de la colonne ${h}`}
                        value={mapping[h] ?? ""}
                        onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
                        className="field-input"
                      >
                        <option value="">Ignorer cette colonne</option>
                        {targets.map((t) => (
                          <option
                            key={t.value}
                            value={t.value}
                            disabled={mapped.includes(t.value) && mapping[h] !== t.value}
                          >
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-ivory-3">
              Prénom et nom sont obligatoires. Les fiches importées sont créées au statut «
              désabonné », sans adhésion.
            </p>
            <Button
              variant="primary"
              disabled={!ready || pending}
              onClick={() =>
                start(async () => {
                  const cleaned = Object.fromEntries(Object.entries(mapping).filter(([, v]) => v));
                  const res = await importMembers({ csv, mapping: cleaned });
                  if (!res.ok) {
                    notify(res.error, "error");
                    return;
                  }
                  setResult(res.data);
                  notify(`${res.data.created} fiche(s) importée(s).`);
                  router.refresh();
                })
              }
            >
              {pending ? "Import en cours…" : "Importer les adhérents"}
            </Button>
          </div>
        </Card>
      ) : null}

      {result ? (
        <Card title="Résultat">
          <p className="text-sm">{result.created} fiche(s) créée(s).</p>
          {result.skipped.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 text-sm text-warn">
              {result.skipped.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
