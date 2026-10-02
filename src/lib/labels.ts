export const EVENT_STATUS: Record<string, { label: string; className: string }> = {
  PLANNED: { label: "V jednání", className: "bg-warn-soft text-warn" },
  CONFIRMED: { label: "Potvrzeno", className: "bg-ok-soft text-ok" },
  CANCELLED: { label: "Zrušeno", className: "bg-bad-soft text-bad" },
};

export const ATTENDANCE: Record<string, { label: string; className: string }> = {
  YES: { label: "Hraju", className: "bg-ok-soft text-ok" },
  MAYBE: { label: "Možná", className: "bg-warn-soft text-warn" },
  NO: { label: "Nemůžu", className: "bg-bad-soft text-bad" },
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
