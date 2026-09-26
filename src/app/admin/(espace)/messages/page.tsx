import type { Metadata } from "next";
import { ActionButton } from "@/components/admin/action-button";
import { FilterSelect, SearchBox } from "@/components/admin/table-controls";
import { Pagination, parseListParams, type SearchParams } from "@/components/admin/table";
import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";
import { deleteMessage, setMessageHandled } from "@/server/actions/messages";
import { listMessages } from "@/server/queries/admin";

export const metadata: Metadata = { title: "Messages" };

function mailto(email: string, firstName: string, original: string) {
  const subject = "Re : votre message à L'Ordre du Nautilus";
  const quoted = original
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");
  const body = `Bonjour ${firstName},\n\n\n\nÀ bientôt au local,\nL'Ordre du Nautilus\n\n${quoted}`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const params = parseListParams(sp, {
    sorts: ["createdAt"],
    defaultSort: "createdAt",
    defaultDir: "desc",
    filters: ["statut"],
  });
  const { total, rows } = await listMessages(params);

  return (
    <>
      <PageHeader
        kicker="Messages"
        title="Boîte de réception"
        description="Les messages traités sont supprimés automatiquement après 6 mois (12 mois s'ils ne sont jamais traités)."
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Prénom, e-mail ou contenu" />
        <FilterSelect
          name="statut"
          label="Non traités"
          options={[
            { value: "traites", label: "Traités" },
            { value: "tous", label: "Tous" },
          ]}
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState>Aucun message ici.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {rows.map((m) => (
            <li key={m.id} className="card p-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p>
                  <b className="font-semibold">{m.firstName}</b>{" "}
                  <span className="text-ivory-3">&lt;{m.email}&gt;</span>
                  {m.game ? <Badge className="ml-2">{m.game}</Badge> : null}
                </p>
                <span className="text-xs text-ivory-3">
                  {formatDateTime(m.createdAt)}
                  {m.handledAt ? ` · traité le ${formatDateTime(m.handledAt)}` : ""}
                </span>
              </div>
              <p className="text-sm whitespace-pre-line text-ivory-2">{m.message}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={mailto(m.email, m.firstName, m.message)}
                  className="inline-flex items-center rounded-full border border-rose bg-rose px-3 py-1.5 font-head text-xs tracking-[0.06em] text-abyss hover:bg-ivory"
                >
                  Répondre par e-mail
                </a>
                <ActionButton
                  action={setMessageHandled}
                  input={{ id: m.id, handled: m.status === "NEW" }}
                  success={
                    m.status === "NEW" ? "Message marqué comme traité." : "Message remis à traiter."
                  }
                >
                  {m.status === "NEW" ? "Marquer comme traité" : "Remettre à traiter"}
                </ActionButton>
                <ActionButton
                  action={deleteMessage}
                  input={{ id: m.id }}
                  variant="subtle"
                  confirm="Supprimer ce message ?"
                  success="Message supprimé."
                >
                  Supprimer
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination total={total} params={params} sp={sp} />
    </>
  );
}
