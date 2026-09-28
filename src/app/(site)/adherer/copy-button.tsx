"use client";

import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* pas de presse-papiers, tant pis, copie à la main */
        }
      }}
    >
      <span aria-live="polite">{copied ? "Copié ✓" : "Copier"}</span>
    </button>
  );
}
