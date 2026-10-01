import { describe, expect, it } from "vitest";
import { calendarDescription, calendarRecipients, calendarStart, calendarTitle, type FullEvent } from "./event-details";
import { buildIcs, escapeIcs, foldLine } from "./ics";

const u = (id: string, name: string) => ({ id, name, email: `${id}@x.cz`, phone: null }) as unknown as FullEvent["band"]["memberships"][number]["user"];

function makeEvent(overrides: Partial<FullEvent> = {}): FullEvent {
  const petr = u("petr", "Petr");
  const jana = u("jana", "Jana");
  const tomas = u("tomas", "Tomáš");
  const sub = u("sub", "Martin");
  return {
    id: "e1",
    bandId: "b1",
    title: "Festival",
    status: "CONFIRMED",
    venueName: "Amfiteátr",
    venueAddress: "Lipnice 1",
    meetingPoint: "Zkušebna",
    departureAt: new Date("2026-07-10T11:00:00Z"),
    getInAt: new Date("2026-07-10T13:00:00Z"),
    soundcheckAt: new Date("2026-07-10T14:00:00Z"),
    startAt: new Date("2026-07-10T18:30:00Z"),
    endAt: null,
    contactName: null,
    contactPhone: null,
    fee: "15 000 Kč",
    dressCode: null,
    setlist: null,
    notes: null,
    createdById: null,
    createdAt: new Date(),
    updatedAt: new Date("2026-07-01T00:00:00Z"),
    band: {
      id: "b1",
      name: "Smršť",
      description: null,
      color: "#000",
      createdAt: new Date(),
      memberships: [
        { id: "m1", bandId: "b1", userId: "petr", role: "LEADER", instrument: "kytara", createdAt: new Date(), user: petr },
        { id: "m2", bandId: "b1", userId: "jana", role: "MEMBER", instrument: "zpěv", createdAt: new Date(), user: jana },
        { id: "m3", bandId: "b1", userId: "tomas", role: "MEMBER", instrument: "bicí", createdAt: new Date(), user: tomas },
        { id: "m4", bandId: "b1", userId: "sub", role: "SUBSTITUTE", instrument: "bicí", createdAt: new Date(), user: sub },
      ],
    },
    attendances: [
      { id: "a1", eventId: "e1", userId: "tomas", status: "NO", note: null, updatedAt: new Date(), user: tomas },
    ],
    lineup: [
      { id: "l1", eventId: "e1", instrument: "kytara", userId: "petr", sortOrder: 0, user: petr },
      { id: "l2", eventId: "e1", instrument: "bicí", userId: "sub", sortOrder: 1, user: sub },
    ],
    cars: [
      {
        id: "c1",
        eventId: "e1",
        driverId: "petr",
        label: "Transit",
        seats: 3,
        departureAt: new Date("2026-07-10T10:30:00Z"),
        departFrom: "Zkušebna",
        note: null,
        driver: petr,
        seatsTaken: [{ id: "s1", carId: "c1", userId: "jana", eventId: "e1", user: jana }],
      },
    ],
    ...overrides,
  } as FullEvent;
}

describe("calendarRecipients", () => {
  it("excludes members who said no and substitutes who are not playing", () => {
    const r = calendarRecipients(makeEvent());
    expect(r).toContain("petr");
    expect(r).toContain("jana");
    expect(r).toContain("sub"); // v sestavě
    expect(r).not.toContain("tomas"); // nemůže
  });

  it("omits substitutes without lineup or positive answer", () => {
    const e = makeEvent({ lineup: [] });
    expect(calendarRecipients(e)).not.toContain("sub");
  });
});

describe("calendar content", () => {
  it("starts at the personal car departure when earlier", () => {
    const e = makeEvent();
    expect(calendarStart(e, "jana").toISOString()).toBe("2026-07-10T10:30:00.000Z");
    expect(calendarStart(e, "tomas").toISOString()).toBe("2026-07-10T11:00:00.000Z");
  });

  it("builds a detailed, personalised description in local time", () => {
    const text = calendarDescription(makeEvent(), "jana", "https://app.cz");
    expect(text).toContain("Sraz / odjezd: 13:00 (Zkušebna)");
    expect(text).toContain("Zvuková zkouška: 16:00");
    expect(text).toContain("Začátek: 20:30");
    expect(text).toContain("Auto: Transit – řidič Petr");
    expect(text).toContain("bicí: Martin");
    expect(text).toContain("https://app.cz/events/e1");
    expect(text).not.toContain("15 000");
    expect(text).not.toContain("Honorář");
  });

  it("marks cancelled events in the title", () => {
    expect(calendarTitle(makeEvent({ status: "CANCELLED" }))).toMatch(/^❌ ZRUŠENO/);
  });
});

describe("ics", () => {
  it("escapes and folds lines", () => {
    expect(escapeIcs("a,b;c\nd")).toBe("a\\,b\;c\\nd");
    const folded = foldLine("X".repeat(200));
    expect(folded.split("\r\n").every((l) => Buffer.byteLength(l) <= 75)).toBe(true);
  });

  it("produces a valid calendar", () => {
    const ics = buildIcs([makeEvent()], "jana", "https://app.cz", "Test");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART:20260710T103000Z");
    expect(ics).toContain("LOCATION:Amfiteátr\\, Lipnice 1");
    expect(ics.trim().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).not.toContain("15 000");
  });
});
