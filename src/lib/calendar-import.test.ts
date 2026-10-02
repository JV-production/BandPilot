import { describe, expect, it } from "vitest";
import { mapGoogleEvent } from "./calendar-import";

describe("mapGoogleEvent", () => {
  it("maps a timed event", () => {
    const f = mapGoogleEvent({
      id: "g1",
      summary: " Muzikály Naruby – Brno ",
      location: "Divadlo Bolka Polívky, Jakubské nám. 5, Brno",
      description: "Příjezd do 17:00<br>Parkování za divadlem",
      start: { dateTime: "2026-11-20T19:30:00+01:00" },
      end: { dateTime: "2026-11-20T22:00:00+01:00" },
    })!;
    expect(f.title).toBe("Muzikály Naruby – Brno");
    expect(f.startAt.toISOString()).toBe("2026-11-20T18:30:00.000Z");
    expect(f.venueName).toBe("Divadlo Bolka Polívky");
    expect(f.venueAddress).toBe("Divadlo Bolka Polívky, Jakubské nám. 5, Brno");
    expect(f.notes).toBe("Příjezd do 17:00\nParkování za divadlem");
    expect(f.cancelled).toBe(false);
  });

  it("maps an all-day event to 20:00 local time with a note", () => {
    const f = mapGoogleEvent({ id: "g2", summary: "Ples", start: { date: "2026-12-05" }, end: { date: "2026-12-06" } })!;
    expect(f.startAt.toISOString()).toBe("2026-12-05T19:00:00.000Z");
    expect(f.notes).toMatch(/upřesněte čas/);
  });

  it("skips events written by BandPilot itself", () => {
    expect(
      mapGoogleEvent({ id: "g3", start: { dateTime: "2026-11-20T19:30:00Z" }, extendedProperties: { private: { bandpilotEventId: "x" } } }),
    ).toBeNull();
  });

  it("recognizes cancelled events", () => {
    expect(mapGoogleEvent({ id: "g4", status: "cancelled" })?.cancelled).toBe(true);
  });
});
