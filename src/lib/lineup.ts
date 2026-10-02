import { prisma } from "./prisma";

/** Výchozí sestava akce = stálí členové a vedoucí se svými nástroji a výchozím honorářem. */
export async function defaultLineup(bandId: string) {
  const core = await prisma.bandMembership.findMany({
    where: { bandId, role: { in: ["LEADER", "MEMBER"] } },
    orderBy: { createdAt: "asc" },
  });
  return core.map((m, i) => ({
    instrument: m.instrument || "hudebník",
    userId: m.userId,
    sortOrder: i,
    pay: m.defaultPay,
  }));
}
