/**
 * Dates : toute la logique métier raisonne en jours calendaires à Paris.
 * Les colonnes @db.Date sont manipulées sous forme de chaînes « AAAA-MM-JJ ».
 */

export const TZ = "Europe/Paris";

const isoDay = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDay(value: string): boolean {
  if (!isoDay.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Jour calendaire à Paris pour un instant donné. */
export function parisDay(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function todayParis(): string {
  return parisDay(new Date());
}

/** Colonne @db.Date (minuit UTC) → « AAAA-MM-JJ ». */
export function dbDateToDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** « AAAA-MM-JJ » → valeur à écrire dans une colonne @db.Date. */
export function dayToDbDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function addDays(day: string, n: number): string {
  const d = dayToDbDate(day);
  d.setUTCDate(d.getUTCDate() + n);
  return dbDateToDay(d);
}

/** Nombre de jours de `from` à `to` (positif si `to` est après). */
export function daysBetween(from: string, to: string): number {
  return Math.round((dayToDbDate(to).getTime() - dayToDbDate(from).getTime()) / 86_400_000);
}

/** Décalage (en minutes) de Paris par rapport à UTC à un instant donné. */
function parisOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** Jour + heure saisis à Paris (« 2026-10-02 », « 19:30 ») → instant UTC. */
export function parisToUtc(day: string, time: string): Date {
  const guess = new Date(`${day}T${time}:00Z`);
  const offset = parisOffsetMinutes(guess);
  const candidate = new Date(guess.getTime() - offset * 60_000);
  // Ajustement si le changement d'heure tombe entre les deux calculs
  const offset2 = parisOffsetMinutes(candidate);
  return offset2 === offset ? candidate : new Date(guess.getTime() - offset2 * 60_000);
}

/** Instant → heure « HH:MM » à Paris. */
export function parisTime(at: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}

/**
 * Fin d'une adhésion : durée inclusive. Une formule de 365 jours commencée
 * le 26/09/2026 se termine le 25/09/2027.
 */
export function membershipEnd(startDay: string, durationDays: number): string {
  return addDays(startDay, durationDays - 1);
}

/**
 * Début d'un renouvellement : le lendemain de l'ancienne fin si elle n'est
 * pas dépassée (pas de chevauchement, pas de trou), sinon aujourd'hui.
 */
export function renewalStart(previousEndDay: string, today: string = todayParis()): string {
  return previousEndDay >= today ? addDays(previousEndDay, 1) : today;
}

/** Saison associative « 2026-2027 », qui bascule au 1er septembre. */
export function seasonLabel(day: string = todayParis()): string {
  const [y, m] = day.split("-").map(Number) as [number, number];
  const start = m >= 9 ? y : y - 1;
  return `${start}-${start + 1}`;
}

/** Deux périodes inclusives [a, b] et [c, d] se chevauchent-elles ? */
export function periodsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
