import { describe, expect, it } from "vitest";
import { parsePay, summarizePay } from "./earnings";

const now = new Date("2026-10-01T12:00:00Z");
const past = new Date("2026-09-01T18:00:00Z");
const future = new Date("2026-11-01T18:00:00Z");

describe("parsePay", () => {
  it("accepts common formats", () => {
    expect(parsePay("3 500")).toBe(3500);
    expect(parsePay("3500 Kč")).toBe(3500);
    expect(parsePay("3.500")).toBe(3500);
    expect(parsePay("")).toBeNull();
  });
  it("rejects garbage", () => {
    expect(() => parsePay("hodně")).toThrow();
  });
});

describe("summarizePay", () => {
  it("splits played / paid / outstanding / upcoming and skips cancelled", () => {
    const s = summarizePay(
      [
        { pay: 3000, paidAt: past, event: { startAt: past, status: "CONFIRMED" } },
        { pay: 2000, paidAt: null, event: { startAt: past, status: "CONFIRMED" } },
        { pay: 5000, paidAt: null, event: { startAt: past, status: "CANCELLED" } },
        { pay: 4000, paidAt: null, event: { startAt: future, status: "PLANNED" } },
        { pay: null, paidAt: null, event: { startAt: future, status: "CONFIRMED" } },
      ],
      now,
    );
    expect(s).toEqual({
      played: 5000,
      paid: 3000,
      outstanding: 2000,
      upcoming: 4000,
      playedCount: 2,
      upcomingCount: 2,
      unsetCount: 1,
    });
  });
});
