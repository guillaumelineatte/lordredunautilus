"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/lib/action-result";
import { Button, type ButtonSize } from "./ui";
import { useToast } from "./toast";

// Bouton qui lance une server action (avec confirmation si besoin), affiche
// un toast puis rafraîchit la page.
export function ActionButton<I, T>({
  action,
  input,
  children,
  confirm,
  success,
  redirectTo,
  variant = "ghost",
  size = "sm",
  className,
  disabled,
  title,
  ariaLabel,
}: {
  action: (input: I) => Promise<ActionResult<T>>;
  input: I;
  children: ReactNode;
  confirm?: string;
  success?: string;
  redirectTo?: string;
  variant?: "primary" | "ghost" | "danger" | "subtle";
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  title?: string;
  // obligatoire quand le bouton n'a qu'une icône
  ariaLabel?: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || pending}
      title={title}
      aria-label={ariaLabel}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const result = await action(input);
          if (!result.ok) {
            notify(result.error, "error");
            return;
          }
          if (success) notify(success);
          if (redirectTo) router.push(redirectTo);
          else router.refresh();
        });
      }}
    >
      {pending ? "…" : children}
    </Button>
  );
}
