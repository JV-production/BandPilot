import type { Prisma } from "@prisma/client";
import { fmtDate, fmtTime, TIMEZONE } from "./time";
import { EVENT_STATUS } from "./labels";

export const eventFullInclude = {
  band: { include: { memberships: { include: { user: true } } } },
  attendances: { include: { user: true } },
  lineup: { include: { user: true }, orderBy: { sortOrder: "asc" } },
  cars: { include: { driver: true, seatsTaken: { include: { user: true } } } },
} satisfies Prisma.EventInclude;

export type FullEvent = Prisma.EventGetPayload<{ include: typeof eventFullInclude }>;

const displayName = (u: { name: string | null; email: string }) => u.name || u.email;

/** Začátek události v kalendáři – od odjezdu (nebo nejbližšího dřívějšího bodu programu). */
export function calendarStart(event: FullEvent, userId?: string): Date {
  const myCar = userId ? findCarForUser(event, userId) : undefined;
  const candidates = [myCar?.departureAt, event.departureAt, event.getInAt, event.soundcheckAt, event.startAt]
    .filter((d): d is Date => !!d);
  return new Date(Math.min(...candidates.map((d) => d.getTime())));
}

export function calendarEnd(event: FullEvent): Date {
  return event.endAt ?? new Date(event.startAt.getTime() + 3 * 60 * 60 * 1000);
}

export function findCarForUser(event: FullEvent, userId: string) {
  return event.cars.find((c) => c.driverId === userId || c.seatsTaken.some((s) => s.userId === userId));
}

export function calendarTitle(event: FullEvent): string {
  const prefix = event.status === "CANCELLED" ? "❌ ZRUŠENO – " : event.status === "PLANNED" ? "❓ " : "🎸 ";
  const venue = event.venueName ? ` – ${event.venueName}` : "";
  return `${prefix}${event.band.name}: ${event.title}${venue}`;
}

/** Detailní popis akce pro kalendář, personalizovaný pro konkrétního člena. */
export function calendarDescription(event: FullEvent, userId: string | null, appUrl: string): string {
  const lines: string[] = [];
  const add = (label: string, value: string | null | undefined) => {
    if (value) lines.push(`${label}: ${value}`);
  };

  lines.push(`${event.band.name} – ${event.title}`);
  lines.push(`Stav: ${EVENT_STATUS[event.status]?.label ?? event.status}`);
  lines.push(`Datum: ${fmtDate(event.startAt)}`);
  lines.push("");

  lines.push("⏱ HARMONOGRAM");
  add("Sraz / odjezd", event.departureAt && `${fmtTime(event.departureAt)}${event.meetingPoint ? ` (${event.meetingPoint})` : ""}`);
  add("Příjezd / get-in", fmtTime(event.getInAt));
  add("Zvuková zkouška", fmtTime(event.soundcheckAt));
  add("Začátek", fmtTime(event.startAt));
  add("Konec", fmtTime(event.endAt));
  lines.push("");

  lines.push("📍 MÍSTO");
  add("Klub / místo", event.venueName);
  add("Adresa", event.venueAddress);
  if (event.venueAddress) {
    lines.push(`Navigace: https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.venueAddress)}`);
  }
  add("Sraz před odjezdem", event.meetingPoint);
  lines.push("");

  if (userId) {
    const mySlots = event.lineup.filter((s) => s.userId === userId).map((s) => s.instrument);
    const myAttendance = event.attendances.find((a) => a.userId === userId);
    const car = findCarForUser(event, userId);
    lines.push("🙋 PRO TEBE");
    if (mySlots.length) add("Hraješ", mySlots.join(", "));
    if (myAttendance) add("Tvoje odpověď", { YES: "hraju", NO: "nemůžu", MAYBE: "možná" }[myAttendance.status]);
    if (car) {
      const others = car.seatsTaken.filter((s) => s.userId !== userId).map((s) => displayName(s.user));
      add(
        "Auto",
        `${car.label || "auto"} – řidič ${car.driverId === userId ? "ty" : displayName(car.driver)}` +
          (car.driverId === userId ? "" : car.driver.phone ? ` (${car.driver.phone})` : ""),
      );
      add("Odjezd auta", car.departureAt && `${fmtTime(car.departureAt)}${car.departFrom ? `, ${car.departFrom}` : ""}`);
      if (others.length) add("Spolujezdci", others.join(", "));
    } else {
      lines.push("Auto: zatím nemáš přiřazené místo v autě");
    }
    lines.push("");
  }

  if (event.lineup.length) {
    lines.push("🎶 SESTAVA");
    for (const slot of event.lineup) {
      lines.push(`${slot.instrument}: ${slot.user ? displayName(slot.user) : "– neobsazeno –"}`);
    }
    lines.push("");
  }

  if (event.cars.length) {
    lines.push("🚗 DOPRAVA");
    for (const car of event.cars) {
      const passengers = car.seatsTaken.map((s) => displayName(s.user));
      lines.push(
        `${car.label || "Auto"} (${displayName(car.driver)})` +
          (car.departureAt ? ` – odjezd ${fmtTime(car.departureAt)}` : "") +
          (passengers.length ? `: ${passengers.join(", ")}` : ""),
      );
    }
    lines.push("");
  }

  if (event.contactName || event.contactPhone || event.fee || event.dressCode) {
    lines.push("ℹ️ DALŠÍ INFO");
    add("Kontakt na místě", [event.contactName, event.contactPhone].filter(Boolean).join(", "));
    add("Honorář", event.fee);
    add("Dress code", event.dressCode);
    lines.push("");
  }
  if (event.setlist) lines.push("📝 SETLIST", event.setlist, "");
  if (event.notes) lines.push("🗒 POZNÁMKY", event.notes, "");

  lines.push(`Detail v aplikaci: ${appUrl}/events/${event.id}`);
  lines.push(`(časy v pásmu ${TIMEZONE})`);
  return lines.join("\n");
}

/** Komu se akce zapisuje do kalendáře: všem členům kapely kromě těch, kdo odpověděli „nemůžu“
 *  a nejsou v sestavě. Alternace dostanou akci jen pokud jsou v sestavě nebo odpověděli kladně. */
export function calendarRecipients(event: FullEvent): string[] {
  const inLineup = new Set(event.lineup.map((s) => s.userId).filter(Boolean) as string[]);
  const answer = new Map(event.attendances.map((a) => [a.userId, a.status]));
  return event.band.memberships
    .filter((m) => {
      if (inLineup.has(m.userId)) return true;
      const status = answer.get(m.userId);
      if (status === "NO") return false;
      if (m.role === "SUBSTITUTE") return status === "YES" || status === "MAYBE";
      return true;
    })
    .map((m) => m.userId);
}
