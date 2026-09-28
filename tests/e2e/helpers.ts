import type { Page } from "@playwright/test";

export const run = Date.now().toString(36);

// dit oui à tous les window.confirm
export function acceptDialogs(page: Page) {
  page.on("dialog", (d) => void d.accept());
}

// AAAA-MM-JJ dans `days` jours
export function inDays(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}
