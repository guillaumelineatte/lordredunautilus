"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function DateFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  return (
    <>
      <label className="grid gap-1">
        <span className="label">Du</span>
        <input
          type="date"
          value={params.get("du") ?? ""}
          onChange={(e) => set("du", e.target.value)}
          className="field-input w-auto"
        />
      </label>
      <label className="grid gap-1">
        <span className="label">Au</span>
        <input
          type="date"
          value={params.get("au") ?? ""}
          onChange={(e) => set("au", e.target.value)}
          className="field-input w-auto"
        />
      </label>
    </>
  );
}
