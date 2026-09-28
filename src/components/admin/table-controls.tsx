"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

function useUpdateParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (!("page" in changes)) next.delete("page");
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  return { params, update, pending };
}

// recherche au fil de la frappe, gardée dans l'url (raccourci /)
export function SearchBox({ placeholder = "Rechercher…" }: { placeholder?: string }) {
  const { params, update, pending } = useUpdateParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <div className="relative w-full max-w-sm">
      <input
        type="search"
        data-search
        value={value}
        placeholder={placeholder}
        aria-label="Rechercher"
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => update({ q: v.trim() || null }), 250);
        }}
        className="field-input pr-16"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-line-strong px-1.5 text-[0.65rem] text-ivory-3">
        {pending ? "…" : "/"}
      </kbd>
    </div>
  );
}

export function FilterSelect({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  const { params, update } = useUpdateParams();
  return (
    <select
      aria-label={label}
      value={params.get(name) ?? ""}
      onChange={(e) => update({ [name]: e.target.value || null })}
      className="field-input w-auto"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
