"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { oneOf, requiredStr, str } from "@/lib/form";
import { parsePay } from "@/lib/earnings";
import { ensureWatch, stopWatch } from "@/lib/band-calendar";
import { importBandCalendarSafe } from "@/lib/calendar-import";
import { hasGoogleCalendar, syncUpcomingForUser } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

const BAND_ROLES = ["LEADER", "MEMBER", "SUBSTITUTE"] as const;

export async function createBand(formData: FormData) {
  await requireAdmin();
  const band = await prisma.band.create({
    data: {
      name: requiredStr(formData, "name", "Název"),
      description: str(formData, "description"),
      color: str(formData, "color") ?? "#6366f1",
    },
  });
  revalidatePath("/bands");
  redirect(`/bands/${band.id}`);
}

export async function updateBand(bandId: string, formData: FormData) {
  await requireAdmin();
  await prisma.band.update({
    where: { id: bandId },
    data: {
      name: requiredStr(formData, "name", "Název"),
      description: str(formData, "description"),
      color: str(formData, "color") ?? "#6366f1",
    },
  });
  revalidatePath(`/bands/${bandId}`);
}

export async function deleteBand(bandId: string) {
  await requireAdmin();
  await prisma.band.delete({ where: { id: bandId } });
  revalidatePath("/bands");
  redirect("/bands");
}

/** Přidá uživatele do kapely podle e-mailu. Pokud účet neexistuje, založí ho –
 *  po prvním přihlášení přes Google se automaticky propojí. */
export async function addMember(bandId: string, formData: FormData) {
  await requireAdmin();
  const email = requiredStr(formData, "email", "E-mail").toLowerCase();
  const name = str(formData, "name");
  const user = await prisma.user.upsert({
    where: { email },
    update: name ? { name } : {},
    create: { email, name },
  });
  await prisma.bandMembership.upsert({
    where: { bandId_userId: { bandId, userId: user.id } },
    update: {
      role: oneOf(str(formData, "role"), BAND_ROLES, "MEMBER"),
      instrument: str(formData, "instrument"),
      defaultPay: parsePay(formData.get("defaultPay")),
    },
    create: {
      bandId,
      userId: user.id,
      role: oneOf(str(formData, "role"), BAND_ROLES, "MEMBER"),
      instrument: str(formData, "instrument"),
      defaultPay: parsePay(formData.get("defaultPay")),
    },
  });
  after(() => syncUpcomingForUser(user.id));
  revalidatePath(`/bands/${bandId}`);
}

export async function updateMember(membershipId: string, formData: FormData) {
  await requireAdmin();
  const m = await prisma.bandMembership.update({
    where: { id: membershipId },
    data: {
      role: oneOf(str(formData, "role"), BAND_ROLES, "MEMBER"),
      instrument: str(formData, "instrument"),
      defaultPay: parsePay(formData.get("defaultPay")),
    },
  });
  revalidatePath(`/bands/${m.bandId}`);
}

export async function removeMember(membershipId: string) {
  await requireAdmin();
  const m = await prisma.bandMembership.delete({ where: { id: membershipId } });
  // Odebereme ho i z budoucích sestav a aut v této kapele.
  const upcoming = { bandId: m.bandId, startAt: { gte: new Date() } };
  await prisma.lineupSlot.updateMany({ where: { userId: m.userId, event: upcoming }, data: { userId: null } });
  await prisma.carSeat.deleteMany({ where: { userId: m.userId, car: { event: upcoming } } });
  after(() => syncUpcomingForUser(m.userId));
  revalidatePath(`/bands/${m.bandId}`);
}

/** Nastaví Google Kalendář, ze kterého se do kapely importují koncerty, a hned ho načte. */
export async function setBandImport(bandId: string, formData: FormData) {
  const admin = await requireAdmin();
  const calendarId = str(formData, "calendarId");
  if (!calendarId) throw new Error("Zadejte ID kalendáře.");
  if (!(await hasGoogleCalendar(admin.id))) {
    throw new Error("Váš účet nemá propojený Google Kalendář. Odhlaste se a přihlaste znovu přes Google (povolte kalendář).");
  }
  await stopWatch(bandId);
  await prisma.band.update({
    where: { id: bandId },
    data: { importCalendarId: calendarId, importOwnerId: admin.id, importError: null },
  });
  // Načíst koncerty z kalendáře a zapnout okamžité notifikace o změnách (kalendář se nijak nemění).
  if (await importBandCalendarSafe(bandId, { deferSync: (task) => after(task) })) await ensureWatch(bandId);
  revalidatePath(`/bands/${bandId}`);
  revalidatePath("/");
}

export async function runBandImport(bandId: string) {
  await requireAdmin();
  if (await importBandCalendarSafe(bandId, { deferSync: (task) => after(task) })) await ensureWatch(bandId);
  revalidatePath(`/bands/${bandId}`);
  revalidatePath("/");
}

export async function clearBandImport(bandId: string) {
  await requireAdmin();
  await stopWatch(bandId);
  // Už importované koncerty zůstávají – jen se přestanou aktualizovat.
  await prisma.band.update({
    where: { id: bandId },
    data: { importCalendarId: null, importOwnerId: null, importedAt: null, importError: null },
  });
  revalidatePath(`/bands/${bandId}`);
}
