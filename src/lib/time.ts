import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { cs } from "date-fns/locale";

export const TIMEZONE = process.env.APP_TIMEZONE || "Europe/Prague";

/** Převod hodnoty z <input type="datetime-local"> (v místním čase kapely) na UTC Date. */
export function parseLocalDateTime(value: FormDataEntryValue | null | undefined): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = fromZonedTime(value, TIMEZONE);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Hodnota pro <input type="datetime-local">. */
export function toLocalInput(date: Date | null | undefined): string {
  return date ? formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd'T'HH:mm") : "";
}

export function fmt(date: Date | null | undefined, pattern: string): string {
  return date ? formatInTimeZone(date, TIMEZONE, pattern, { locale: cs }) : "";
}

export const fmtTime = (d: Date | null | undefined) => fmt(d, "HH:mm");
export const fmtDate = (d: Date | null | undefined) => fmt(d, "EEEE d. M. yyyy");
export const fmtShortDate = (d: Date | null | undefined) => fmt(d, "EEE d. M.");
export const fmtDateTime = (d: Date | null | undefined) => fmt(d, "d. M. yyyy HH:mm");
