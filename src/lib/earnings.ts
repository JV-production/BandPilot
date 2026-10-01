const czk = new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 });

export const formatCzk = (amount: number | null | undefined) => (amount == null ? "neurčeno" : czk.format(amount));

/** "3 500", "3500 Kč", "3.500" → 3500; prázdné → null. */
export function parsePay(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/[\s. ]|kč/gi, "");
  if (digits === "") return null;
  if (!/^\d+$/.test(digits)) throw new Error("Honorář zadejte jako celé číslo v Kč.");
  return Number(digits);
}

export type PaySlot = {
  pay: number | null;
  paidAt: Date | null;
  event: { startAt: Date; status: string };
};

export type PaySummary = {
  played: number; // odehráno (součet honorářů za proběhlé akce)
  paid: number; // z toho vyplaceno
  outstanding: number; // zbývá vyplatit
  upcoming: number; // nadcházející akce
  playedCount: number;
  upcomingCount: number;
  unsetCount: number; // akce bez určeného honoráře
};

/** Souhrn honorářů jednoho hráče. Zrušené akce se nepočítají. */
export function summarizePay(slots: PaySlot[], now = new Date()): PaySummary {
  const s: PaySummary = { played: 0, paid: 0, outstanding: 0, upcoming: 0, playedCount: 0, upcomingCount: 0, unsetCount: 0 };
  for (const slot of slots) {
    if (slot.event.status === "CANCELLED") continue;
    const amount = slot.pay ?? 0;
    if (slot.pay == null) s.unsetCount++;
    if (slot.event.startAt < now) {
      s.playedCount++;
      s.played += amount;
      if (slot.paidAt) s.paid += amount;
      else s.outstanding += amount;
    } else {
      s.upcomingCount++;
      s.upcoming += amount;
    }
  }
  return s;
}
