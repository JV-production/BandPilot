import { notFound } from "next/navigation";
import type { CurrentUser } from "./auth";
import { prisma } from "./prisma";

export const isAdmin = (user: CurrentUser) => user.role === "ADMIN";

/** Vrátí členství v kapele (nebo null). Organizátor má přístup ke všem kapelám. */
export async function getMembership(user: CurrentUser, bandId: string) {
  return prisma.bandMembership.findUnique({
    where: { bandId_userId: { bandId, userId: user.id } },
  });
}

export async function canViewBand(user: CurrentUser, bandId: string) {
  return isAdmin(user) || !!(await getMembership(user, bandId));
}

/** Upravovat akce, sestavu a ankety může organizátor a vedoucí kapely. */
export async function canManageBand(user: CurrentUser, bandId: string) {
  if (isAdmin(user)) return true;
  const membership = await getMembership(user, bandId);
  return membership?.role === "LEADER";
}

export async function assertCanViewBand(user: CurrentUser, bandId: string) {
  if (!(await canViewBand(user, bandId))) notFound();
}

export async function assertCanManageBand(user: CurrentUser, bandId: string) {
  if (!(await canManageBand(user, bandId))) throw new Error("Nemáte oprávnění upravovat tuto kapelu.");
}

/** ID kapel, které uživatel vidí. */
export async function visibleBandIds(user: CurrentUser): Promise<string[]> {
  if (isAdmin(user)) {
    return (await prisma.band.findMany({ select: { id: true } })).map((b) => b.id);
  }
  return (
    await prisma.bandMembership.findMany({ where: { userId: user.id }, select: { bandId: true } })
  ).map((m) => m.bandId);
}
