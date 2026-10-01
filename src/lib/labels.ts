export const EVENT_STATUS: Record<string, { label: string; className: string }> = {
  PLANNED: { label: "V jednání", className: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "Potvrzeno", className: "bg-emerald-100 text-emerald-800" },
  CANCELLED: { label: "Zrušeno", className: "bg-rose-100 text-rose-800" },
};

export const ATTENDANCE: Record<string, { label: string; className: string }> = {
  YES: { label: "Hraju", className: "bg-emerald-100 text-emerald-800" },
  MAYBE: { label: "Možná", className: "bg-amber-100 text-amber-800" },
  NO: { label: "Nemůžu", className: "bg-rose-100 text-rose-800" },
};

export const BAND_ROLE: Record<string, string> = {
  LEADER: "Vedoucí",
  MEMBER: "Člen",
  SUBSTITUTE: "Alternace",
};

export const USER_ROLE: Record<string, string> = {
  ADMIN: "Organizátor",
  USER: "Uživatel",
};
