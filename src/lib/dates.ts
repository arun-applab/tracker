// Calendar-date helpers. A "date string" is YYYY-MM-DD; in the database calendar
// dates are stored as UTC midnight so they never shift across timezones.
// Pure functions — safe on client and server.

const DAY = 86_400_000;

export function toDbDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  return toIso(new Date(toDbDate(iso).getTime() + n * DAY));
}

export function diffDays(a: string, b: string): number {
  return Math.round((toDbDate(a).getTime() - toDbDate(b).getTime()) / DAY);
}

/** Monday of the week containing `iso`. */
export function weekStart(iso: string): string {
  const dow = toDbDate(iso).getUTCDay(); // 0 = Sun
  return addDays(iso, dow === 0 ? -6 : 1 - dow);
}

export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function isValidIso(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(toDbDate(iso).getTime()) && toIso(toDbDate(iso)) === iso;
}

const fmtShort = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const fmtLong = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fmtDow = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });

/** "14 Oct 2026" */
export function formatDate(v: string | Date): string {
  return fmtLong.format(typeof v === "string" ? toDbDate(v) : v);
}
/** "14 Oct" */
export function formatShortDate(v: string | Date): string {
  return fmtShort.format(typeof v === "string" ? toDbDate(v) : v);
}
/** "Wed" */
export function formatDow(v: string | Date): string {
  return fmtDow.format(typeof v === "string" ? toDbDate(v) : v);
}

export function formatHours(h: number): string {
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
}
