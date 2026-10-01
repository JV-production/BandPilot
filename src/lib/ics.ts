import { calendarDescription, calendarEnd, calendarStart, calendarTitle, type FullEvent } from "./event-details";

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Zalomení řádků dle RFC 5545 (max. 75 oktetů). */
export function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let currentLen = 0;
  for (const ch of line) {
    const len = Buffer.byteLength(ch, "utf8");
    const limit = parts.length === 0 ? 75 : 74;
    if (currentLen + len > limit) {
      parts.push(current);
      current = "";
      currentLen = 0;
    }
    current += ch;
    currentLen += len;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(events: FullEvent[], userId: string, appUrl: string, calendarName: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BandPilot//CS",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
  ];
  const now = icsDate(new Date());
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@bandpilot`,
      `DTSTAMP:${now}`,
      `LAST-MODIFIED:${icsDate(event.updatedAt)}`,
      `DTSTART:${icsDate(calendarStart(event, userId))}`,
      `DTEND:${icsDate(calendarEnd(event))}`,
      `SUMMARY:${escapeIcs(calendarTitle(event))}`,
      `DESCRIPTION:${escapeIcs(calendarDescription(event, userId, appUrl))}`,
      `URL:${appUrl}/events/${event.id}`,
      `STATUS:${event.status === "CANCELLED" ? "CANCELLED" : event.status === "CONFIRMED" ? "CONFIRMED" : "TENTATIVE"}`,
    );
    const location = [event.venueName, event.venueAddress].filter(Boolean).join(", ");
    if (location) lines.push(`LOCATION:${escapeIcs(location)}`);
    lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Připomínka", "TRIGGER:-PT2H", "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
