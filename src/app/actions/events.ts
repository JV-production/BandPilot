"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { parsePay } from "@/lib/earnings";
import { defaultLineup } from "@/lib/lineup";
import { oneOf, requiredStr, str } from "@/lib/form";
import { removeEventFromCalendars, syncEventToCalendars } from "@/lib/google-calendar";
import { assertCanManageBand, canManageBand, getMembership, isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { parseLocalDateTime } from "@/lib/time";

const STATUSES = ["PLANNED", "CONFIRMED", "CANCELLED"] as const;

function eventData(formData: FormData, canSetFee: boolean) {
  const startAt = parseLocalDateTime(formData.get("startAt"));
  if (!startAt) throw new Error("Vyplňte datum a čas začátku.");
  return {
    title: requiredStr(formData, "title", "Název akce"),
    status: oneOf(str(formData, "status"), STATUSES, "PLANNED"),
    venueName: str(formData, "venueName"),
    venueAddress: str(formData, "venueAddress"),
    meetingPoint: str(formData, "meetingPoint"),
    departureAt: parseLocalDateTime(formData.get("departureAt")),
    getInAt: parseLocalDateTime(formData.get("getInAt")),
    soundcheckAt: parseLocalDateTime(formData.get("soundcheckAt")),
    startAt,
    endAt: parseLocalDateTime(formData.get("endAt")),
    contactName: str(formData, "contactName"),
    contactPhone: str(formData, "contactPhone"),
    // Honorář smí nastavit jen organizátor; jinak zůstává beze změny.
    ...(canSetFee ? { fee: str(formData, "fee") } : {}),
    dressCode: str(formData, "dressCode"),
    setlist: str(formData, "setlist"),
    notes: str(formData, "notes"),
  };
}

function scheduleSync(eventId: string) {
  after(() => syncEventToCalendars(eventId));
}

async function loadEventForUser(eventId: string) {
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Akce neexistuje.");
  const membership = await getMembership(user, event.bandId);
  if (!membership && !isAdmin(user)) throw new Error("Do této kapely nemáte přístup.");
  const manager = await canManageBand(user, event.bandId);
  return { user, event, membership, manager };
}

export async function createEvent(bandId: string, formData: FormData) {
  const user = await requireUser();
  await assertCanManageBand(user, bandId);
  const data = eventData(formData, isAdmin(user));

  const event = await prisma.event.create({
    data: { ...data, bandId, createdById: user.id, lineup: { create: await defaultLineup(bandId) } },
  });
  scheduleSync(event.id);
  revalidatePath("/");
  redirect(`/events/${event.id}`);
}

export async function updateEvent(eventId: string, formData: FormData) {
  const { manager, user } = await loadEventForUser(eventId);
  if (!manager) throw new Error("Akci může upravit jen organizátor nebo vedoucí kapely.");
  await prisma.event.update({ where: { id: eventId }, data: eventData(formData, isAdmin(user)) });
  scheduleSync(eventId);
  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

export async function deleteEvent(eventId: string) {
  const { manager, event } = await loadEventForUser(eventId);
  if (!manager) throw new Error("Akci může smazat jen organizátor nebo vedoucí kapely.");
  await removeEventFromCalendars(eventId);
  await prisma.event.delete({ where: { id: eventId } });
  revalidatePath("/");
  redirect(`/bands/${event.bandId}`);
}

export async function setAttendance(eventId: string, formData: FormData) {
  const { user, membership } = await loadEventForUser(eventId);
  if (!membership) throw new Error("Odpovídat mohou jen členové kapely.");
  const status = oneOf(str(formData, "status"), ["YES", "NO", "MAYBE"], "YES");
  const note = str(formData, "note");
  await prisma.attendance.upsert({
    where: { eventId_userId: { eventId, userId: user.id } },
    update: { status, note },
    create: { eventId, userId: user.id, status, note },
  });
  if (status === "NO") {
    // Kdo nejede, uvolní místo v autě.
    await prisma.carSeat.deleteMany({ where: { eventId, userId: user.id } });
  }
  scheduleSync(eventId);
  revalidatePath(`/events/${eventId}`);
}

/** Obsazení pozice v sestavě. Vedoucí může dosadit kohokoli z kapely;
 *  člen/alternace se může sám přihlásit na volnou pozici (nebo za někoho, kdo nemůže). */
export async function assignLineupSlot(slotId: string, formData: FormData) {
  const slot = await prisma.lineupSlot.findUnique({ where: { id: slotId } });
  if (!slot) throw new Error("Pozice neexistuje.");
  const { user, manager, membership, event } = await loadEventForUser(slot.eventId);
  const target = str(formData, "userId");

  if (!manager) {
    if (!membership) throw new Error("Nejste členem kapely.");
    const holderSaidNo = slot.userId
      ? (await prisma.attendance.findUnique({
          where: { eventId_userId: { eventId: slot.eventId, userId: slot.userId } },
        }))?.status === "NO"
      : true;
    const takingFreeSlot = target === user.id && (holderSaidNo || slot.userId === null);
    const leavingOwnSlot = target === null && slot.userId === user.id;
    if (!takingFreeSlot && !leavingOwnSlot) throw new Error("Tuto pozici může změnit jen vedoucí kapely.");
  }
  if (target) {
    const isMember = await prisma.bandMembership.findUnique({
      where: { bandId_userId: { bandId: event.bandId, userId: target } },
    });
    if (!isMember) throw new Error("Vybraný hráč není členem kapely.");
  }

  const previous = slot.userId;
  let pay = slot.pay;
  if (target !== previous && pay == null && target) {
    // Pozice bez určeného honoráře převezme výchozí sazbu nového hráče.
    pay = (await prisma.bandMembership.findUnique({ where: { bandId_userId: { bandId: event.bandId, userId: target } } }))
      ?.defaultPay ?? null;
  }
  await prisma.lineupSlot.update({
    where: { id: slotId },
    // Při změně hráče se vynuluje příznak vyplacení – patřil předchozímu hráči.
    data: { userId: target, pay, ...(target !== previous ? { paidAt: null } : {}) },
  });
  if (target && target !== previous) {
    // Nový hráč v sestavě automaticky potvrzuje účast.
    await prisma.attendance.upsert({
      where: { eventId_userId: { eventId: slot.eventId, userId: target } },
      update: { status: "YES" },
      create: { eventId: slot.eventId, userId: target, status: "YES" },
    });
  }
  scheduleSync(slot.eventId);
  revalidatePath(`/events/${slot.eventId}`);
}

export async function addLineupSlot(eventId: string, formData: FormData) {
  const { manager, user } = await loadEventForUser(eventId);
  if (!manager) throw new Error("Sestavu může upravit jen vedoucí kapely.");
  const pay = isAdmin(user) ? parsePay(formData.get("pay")) : null;
  const count = await prisma.lineupSlot.count({ where: { eventId } });
  await prisma.lineupSlot.create({
    data: { eventId, instrument: requiredStr(formData, "instrument", "Pozice"), sortOrder: count, pay },
  });
  scheduleSync(eventId);
  revalidatePath(`/events/${eventId}`);
}

export async function removeLineupSlot(slotId: string) {
  const slot = await prisma.lineupSlot.findUnique({ where: { id: slotId } });
  if (!slot) return;
  const { manager } = await loadEventForUser(slot.eventId);
  if (!manager) throw new Error("Sestavu může upravit jen vedoucí kapely.");
  await prisma.lineupSlot.delete({ where: { id: slotId } });
  scheduleSync(slot.eventId);
  revalidatePath(`/events/${slot.eventId}`);
}

/** Honorář za pozici a jeho vyplacení – jen organizátor. */
export async function setSlotPay(slotId: string, formData: FormData) {
  const user = await requireUser();
  if (!isAdmin(user)) throw new Error("Honoráře může upravovat jen organizátor.");
  const slot = await prisma.lineupSlot.findUnique({ where: { id: slotId } });
  if (!slot) throw new Error("Pozice neexistuje.");
  const paid = formData.get("paid") === "on";
  await prisma.lineupSlot.update({
    where: { id: slotId },
    data: {
      pay: parsePay(formData.get("pay")),
      paidAt: paid ? (slot.paidAt ?? new Date()) : null,
    },
  });
  revalidatePath(`/events/${slot.eventId}`);
  revalidatePath("/earnings");
}
