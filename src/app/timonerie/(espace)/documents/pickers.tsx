"use client";

import { useState } from "react";
import { buttonClass } from "@/components/admin/ui";

export function DocumentPickers({
  kind,
  param,
  label,
  options,
  extra,
}: {
  kind: string;
  param: string;
  label: string;
  options: { value: string; label: string }[];
  extra?: string;
}) {
  const [value, setValue] = useState("");
  const href = value
    ? `/api/timonerie/pdf/${kind}?${param}=${encodeURIComponent(value)}${extra ? `&${extra}` : ""}`
    : undefined;
  return (
    <div className="grid gap-1.5">
      <span className="label">{label}</span>
      <div className="flex gap-2">
        <select
          aria-label={label}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="field-input"
        >
          <option value="">{options.length ? "Choisir…" : "Aucun élément disponible"}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <a
          href={href}
          aria-disabled={!href}
          className={buttonClass("primary") + (href ? "" : " pointer-events-none opacity-40")}
        >
          Générer
        </a>
      </div>
    </div>
  );
}
