"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/contenus/temoignages", label: "Témoignages" },
  { href: "/admin/contenus/faq", label: "FAQ" },
  { href: "/admin/contenus/formules", label: "Formules" },
  { href: "/admin/contenus/jeux", label: "Jeux" },
  { href: "/admin/contenus/reglages", label: "Réglages du site" },
];

export function ContentTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Contenus" className="mb-8 flex flex-wrap gap-2 border-b border-line pb-3">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={pathname === t.href ? "page" : undefined}
          className={clsx(
            "rounded-full border px-4 py-1.5 font-head text-sm tracking-[0.06em]",
            pathname === t.href
              ? "border-rose bg-rose text-abyss"
              : "border-line-strong text-ivory-2 hover:border-ivory",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
