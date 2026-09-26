import { TZ } from "./dates";

const MONTHS_SHORT = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

export function monthShort(monthIndex: number): string {
  return MONTHS_SHORT[monthIndex] ?? "";
}

/** 3 500 → « 35 € », 350 → « 3,50 € ». */
export function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const euros = cents / 100;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(euros) ? 0 : 2,
  }).format(euros);
}

/** Montant sans symbole, pour les cartes de formule (« 35 »). */
export function formatAmount(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: Number.isInteger(euros) ? 0 : 2,
  }).format(euros);
}

/** « AAAA-MM-JJ » ou Date @db.Date → « 26/09/2026 ». */
export function formatDay(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const day = typeof value === "string" ? value : value.toISOString().slice(0, 10);
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

/** « AAAA-MM-JJ » → « samedi 17 octobre 2026 ». */
export function formatDayLong(value: string | Date): string {
  const day = typeof value === "string" ? value : value.toISOString().slice(0, 10);
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${day}T12:00:00Z`));
}

/** Instant → « 26/09/2026 à 19:30 » (heure de Paris). */
export function formatDateTime(value: Date | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    dateStyle: "short",
    timeStyle: "short",
  })
    .format(value)
    .replace(" ", " à ");
}

/** Instant → « samedi 17 octobre » (heure de Paris). */
export function formatEventDate(value: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(value);
}

/** Heure affichée à la française : « 19h », « 18h30 ». */
export function formatHour(value: Date): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return m === "00" ? `${h}h` : `${h}h${m}`;
}

/** Jour du mois et mois court à Paris, pour la pastille de date des événements. */
export function eventDateParts(value: Date): { day: number; month: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    day: "numeric",
    month: "numeric",
  }).formatToParts(value);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? 1);
  const month = Number(parts.find((p) => p.type === "month")?.value ?? 1) - 1;
  return { day, month: monthShort(month) };
}

export function plural(n: number, singular: string, pluralForm?: string): string {
  return `${n} ${n > 1 ? (pluralForm ?? `${singular}s`) : singular}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}
