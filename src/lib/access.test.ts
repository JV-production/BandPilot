import { describe, expect, it } from "vitest";
import { canLogIn } from "./access";

const base = { email: "x@y.cz", known: false, isAdmin: false, adminEmails: ["boss@y.cz"], locked: false };

describe("canLogIn", () => {
  it("lets in only invited users", () => {
    expect(canLogIn({ ...base })).toBe(false);
    expect(canLogIn({ ...base, known: true })).toBe(true);
  });
  it("always lets organizers in", () => {
    expect(canLogIn({ ...base, email: "Boss@Y.cz" })).toBe(true);
    expect(canLogIn({ ...base, isAdmin: true, locked: true })).toBe(true);
  });
  it("locks everyone else when LOGIN_LOCKED", () => {
    expect(canLogIn({ ...base, known: true, locked: true })).toBe(false);
    expect(canLogIn({ ...base, email: "boss@y.cz", locked: true })).toBe(true);
  });
  it("rejects missing e-mail", () => {
    expect(canLogIn({ ...base, email: null, known: true })).toBe(false);
  });
});
