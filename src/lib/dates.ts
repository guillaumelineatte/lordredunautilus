// Toute la logique métier compte en jours, heure de Paris.
// Les colonnes @db.Date sont manipulées en chaînes "AAAA-MM-JJ".

export const TZ = "Europe/Paris";

const isoDay = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDay(value: string): boolean {
  if (!isoDay.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

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

// les @db.Date arrivent à minuit UTC
export function dbDateToDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dayToDbDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function addDays(day: string, n: number): string {
  const d = dayToDbDate(day);
  d.setUTCDate(d.getUTCDate() + n);
  return dbDateToDay(d);
}

// positif si `to` est après `from`
export function daysBetween(from: string, to: string): number {
  return Math.round((dayToDbDate(to).getTime() - dayToDbDate(from).getTime()) / 86_400_000);
}

// décalage Paris / UTC en minutes à cet instant
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

// jour + heure saisis à Paris ("2026-10-02", "19:30") vers un instant UTC
export function parisToUtc(day: string, time: string): Date {
  const guess = new Date(`${day}T${time}:00Z`);
  const offset = parisOffsetMinutes(guess);
  const candidate = new Date(guess.getTime() - offset * 60_000);
  // au cas où le changement d'heure tombe pile entre les deux
  const offset2 = parisOffsetMinutes(candidate);
  return offset2 === offset ? candidate : new Date(guess.getTime() - offset2 * 60_000);
}

export function parisTime(at: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}

// Durée inclusive : 365 jours à partir du 26/09/2026, ça finit le 25/09/2027.
export function membershipEnd(startDay: string, durationDays: number): string {
  return addDays(startDay, durationDays - 1);
}

// Si l'ancienne adhésion court encore, on repart du lendemain de sa fin (ni trou
// ni chevauchement). Sinon on repart d'aujourd'hui.
export function renewalStart(previousEndDay: string, today: string = todayParis()): string {
  return previousEndDay >= today ? addDays(previousEndDay, 1) : today;
}

// la saison change le 1er septembre
export function seasonLabel(day: string = todayParis()): string {
  const [y, m] = day.split("-").map(Number) as [number, number];
  const start = m >= 9 ? y : y - 1;
  return `${start}-${start + 1}`;
}

// bornes incluses
export function periodsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
