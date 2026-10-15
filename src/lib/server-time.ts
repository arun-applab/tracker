import "server-only";

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Qatar";

/** Today's calendar date (YYYY-MM-DD) in the app timezone. */
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

const fmtDateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Timestamp formatted in the app timezone, e.g. "14 Oct 2026, 15:42". */
export function formatDateTime(d: Date): string {
  return fmtDateTime.format(d);
}
