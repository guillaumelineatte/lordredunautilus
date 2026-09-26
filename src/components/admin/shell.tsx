"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { ToastProvider } from "./toast";

const NAV = [
  { href: "/admin", label: "Tableau de bord", exact: true },
  { href: "/admin/adherents", label: "Adhérents" },
  { href: "/admin/evenements", label: "Événements" },
  { href: "/admin/galerie", label: "Galerie" },
  { href: "/admin/contenus", label: "Contenus" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/journal", label: "Journal" },
  { href: "/admin/registre", label: "Registre RGPD" },
  { href: "/admin/compte", label: "Mon compte" },
];

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** Raccourcis : « / » pour chercher, « n » pour créer. */
function Shortcuts() {
  const router = useRouter();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === "/") {
        const input = document.querySelector<HTMLInputElement>("[data-search]");
        if (input) {
          e.preventDefault();
          input.focus();
          input.select();
        }
      } else if (e.key === "n") {
        const link = document.querySelector<HTMLAnchorElement>("[data-shortcut='new']");
        if (link) {
          e.preventDefault();
          router.push(link.getAttribute("href") ?? "/admin");
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return null;
}

export function AdminShell({ children, unread }: { children: ReactNode; unread: number }) {
  const pathname = usePathname();
  const router = useRouter();
  // Le menu mobile se referme de lui-même quand l'adresse change.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);

  async function signOut() {
    await authClient.signOut();
    router.push("/admin/connexion");
    router.refresh();
  }

  return (
    <ToastProvider>
      <Shortcuts />
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-rose focus:px-3 focus:py-1 focus:text-abyss"
      >
        Aller au contenu
      </a>
      <div className="min-h-svh lg:grid lg:grid-cols-[15rem_1fr]">
        <aside
          className={clsx(
            "fixed inset-y-0 left-0 z-40 w-60 border-r border-line bg-abyss px-4 py-6 transition-transform lg:sticky lg:top-0 lg:h-svh lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Link href="/admin" className="mb-8 flex items-center gap-3 px-2">
            <Image src="/logo.png" alt="" width={36} height={36} className="rounded-full" />
            <span className="font-head text-sm tracking-[0.08em]">
              L&apos;Ordre du <b className="font-normal text-rose">Nautilus</b>
            </span>
          </Link>
          <nav aria-label="Administration" className="grid gap-0.5">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex items-center justify-between rounded-s px-3 py-2 font-head text-sm tracking-[0.04em] transition-colors",
                    active
                      ? "bg-surface text-ivory"
                      : "text-ivory-2 hover:bg-surface/60 hover:text-ivory",
                  )}
                >
                  {item.label}
                  {item.href === "/admin/messages" && unread > 0 ? (
                    <span className="rounded-full bg-rose px-1.5 text-[0.65rem] text-abyss">
                      {unread}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="absolute inset-x-4 bottom-6 grid gap-2">
            <Link href="/" target="_blank" className="px-3 text-xs text-ivory-3 hover:text-ivory">
              Voir le site ↗
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="px-3 text-left text-xs text-ivory-3 hover:text-rose"
            >
              Se déconnecter
            </button>
          </div>
        </aside>
        {open ? (
          <button
            type="button"
            aria-label="Fermer le menu"
            className="fixed inset-0 z-30 bg-abyss/70 lg:hidden"
            onClick={() => setOpen(false)}
          />
        ) : null}
        <div className="min-w-0">
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-navy/90 px-4 py-3 backdrop-blur lg:hidden">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="font-head text-sm tracking-[0.08em]"
              aria-label="Ouvrir le menu"
            >
              ☰ Menu
            </button>
            <span className="font-head text-sm">Administration</span>
          </div>
          <main id="contenu" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
