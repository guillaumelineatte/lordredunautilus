"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { deleteConfirmation } from "@/lib/member-deletion";
import { deleteMemberAction, deleteMembersAction } from "@/server/actions/members";
import { ActionButton } from "./action-button";
import { PencilIcon, TrashIcon } from "./icons";
import { useToast } from "./toast";
import { Badge, Button, buttonClass } from "./ui";

export type MemberRow = {
  id: string;
  firstName: string;
  lastName: string;
  games: string;
  cardNumber: string | null;
  lastMembership: string | null;
  ended: boolean;
  statusLabel: string;
  statusTone: "ok" | "warn" | "danger";
  inTrash: boolean;
  membershipCount: number;
};

export function MembersTable({ rows, head }: { rows: MemberRow[]; head: ReactNode }) {
  const router = useRouter();
  const { notify } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const visible = selected.filter((id) => rows.some((r) => r.id === id));
  const allChecked = rows.length > 0 && visible.length === rows.length;

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  function deleteSelection() {
    const chosen = rows.filter((r) => visible.includes(r.id));
    const withMemberships = chosen.filter((r) => r.membershipCount > 0).length;
    const message =
      `Supprimer ${chosen.length} fiche(s) ?\n\n` +
      `• ${chosen.length - withMemberships} sans adhésion : effacées entièrement.\n` +
      `• ${withMemberships} avec adhésions : nom, identifiants et documents effacés, montants conservés en comptabilité sous « Ancien membre ».\n\n` +
      "Cette action est irréversible.";
    if (!window.confirm(message)) return;
    start(async () => {
      const res = await deleteMembersAction({ ids: chosen.map((r) => r.id) });
      if (!res.ok) {
        notify(res.error, "error");
        return;
      }
      notify(
        `${res.data.deleted + res.data.anonymized} fiche(s) supprimée(s)` +
          (res.data.anonymized ? ` (dont ${res.data.anonymized} anonymisée(s)).` : "."),
      );
      setSelected([]);
      router.refresh();
    });
  }

  return (
    <>
      {visible.length > 0 ? (
        <div
          role="region"
          aria-label="Actions sur la sélection"
          className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-m border border-rose/40 bg-rose/5 px-4 py-2.5 text-sm"
        >
          <span>{visible.length} fiche(s) sélectionnée(s)</span>
          <span className="flex gap-2">
            <Button size="sm" variant="subtle" onClick={() => setSelected([])}>
              Tout désélectionner
            </Button>
            <Button size="sm" variant="danger" disabled={pending} onClick={deleteSelection}>
              {pending ? "Suppression…" : "Supprimer la sélection"}
            </Button>
          </span>
        </div>
      ) : null}
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th className="w-8">
                <input
                  type="checkbox"
                  aria-label="Tout sélectionner"
                  checked={allChecked}
                  onChange={() => setSelected(allChecked ? [] : rows.map((r) => r.id))}
                  className="size-4 accent-rose"
                />
              </th>
              {head}
              <th className="w-24">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const name = `${m.firstName} ${m.lastName}`;
              return (
                <tr key={m.id} className={visible.includes(m.id) ? "bg-rose/5" : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Sélectionner ${name}`}
                      checked={visible.includes(m.id)}
                      onChange={() => toggle(m.id)}
                      className="size-4 accent-rose"
                    />
                  </td>
                  <td>
                    <Link
                      href={`/timonerie/adherents/${m.id}`}
                      className="font-semibold hover:text-rose"
                    >
                      {m.lastName}
                    </Link>
                  </td>
                  <td>{m.firstName}</td>
                  <td className="text-ivory-2">{m.games || "—"}</td>
                  <td className="font-mono text-xs">{m.cardNumber ?? "—"}</td>
                  <td className={m.ended ? "text-ivory-3" : ""}>{m.lastMembership ?? "Aucune"}</td>
                  <td>
                    {m.inTrash ? (
                      <Badge tone="danger">corbeille</Badge>
                    ) : (
                      <Badge tone={m.statusTone}>{m.statusLabel}</Badge>
                    )}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <Link
                      href={`/timonerie/adherents/${m.id}?modifier=1`}
                      className={buttonClass("subtle", "icon")}
                      title="Modifier"
                      aria-label={`Modifier la fiche de ${name}`}
                    >
                      <PencilIcon />
                    </Link>
                    <ActionButton
                      action={deleteMemberAction}
                      input={{ id: m.id }}
                      variant="subtle"
                      size="icon"
                      className="hover:text-danger"
                      confirm={deleteConfirmation(name, m.membershipCount)}
                      success="Fiche supprimée."
                      title="Supprimer"
                      ariaLabel={`Supprimer la fiche de ${name}`}
                    >
                      <TrashIcon />
                    </ActionButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
