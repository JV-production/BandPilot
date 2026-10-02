// Kdo se smí přihlásit.

export const parseEmails = (value: string | undefined) =>
  (value || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export type LoginCheck = {
  email: string | null | undefined;
  /** Uživatel už v aplikaci existuje (přidal ho organizátor do kapely nebo v sekci Lidé). */
  known: boolean;
  /** Uživatel má roli organizátora. */
  isAdmin: boolean;
  adminEmails: string[];
  /** LOGIN_LOCKED=true – aplikace je dočasně uzavřená, pustí jen organizátory. */
  locked: boolean;
};

export function canLogIn({ email, known, isAdmin, adminEmails, locked }: LoginCheck): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  const admin = isAdmin || adminEmails.includes(normalized);
  if (admin) return true;
  if (locked) return false;
  // Jen na pozvání: přihlásit se může jen ten, koho organizátor předem přidal.
  return known;
}

export const loginLocked = () => process.env.LOGIN_LOCKED === "true";
