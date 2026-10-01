"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireUser } from "@/lib/auth";
import { str } from "@/lib/form";
import { syncEventToCalendars } from "@/lib/google-calendar";
import { canManageBand, getMembership } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { parseLocalDateTime } from "@/lib/time";

async function context(eventId: string) {
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error("Akce neexistuje.");
  const membership = await getMembership(user, event.bandId);
  const manager = await canManageBand(user, event.bandId);
  if (!membership && !manager) throw new Error("Do této kapely nemáte přístup.");
  return { user, event, manager };
}

function done(eventId: string) {
  after(() => syncEventToCalendars(eventId));
  revalidatePath(`/events/${eventId}`);
}

export async function addCar(eventId: string, formData: FormData) {
  const { user, event, manager } = await context(eventId);
  const driverId = (manager && str(formData, "driverId")) || user.id;
  const driverMember = await prisma.bandMembership.findUnique({
    where: { bandId_userId: { bandId: event.bandId, userId: driverId } },
  });
  if (!driverMember) throw new Error("Řidič musí být členem kapely.");
  if (await prisma.car.findFirst({ where: { eventId, driverId } })) throw new Error("Tento řidič už auto přidané má.");

  const seats = Math.max(1, Math.min(8, Number(str(formData, "seats") ?? 4) || 4));
  await prisma.carSeat.deleteMany({ where: { eventId, userId: driverId } });
  await prisma.car.create({
    data: {
      eventId,
      driverId,
      seats,
      label: str(formData, "label"),
      departFrom: str(formData, "departFrom"),
      departureAt: parseLocalDateTime(formData.get("departureAt")) ?? event.departureAt,
      note: str(formData, "note"),
    },
  });
  done(eventId);
}

export async function deleteCar(carId: string) {
  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car) return;
  const { user, manager } = await context(car.eventId);
  if (!manager && car.driverId !== user.id) throw new Error("Auto může odebrat jen řidič nebo vedoucí.");
  await prisma.car.delete({ where: { id: carId } });
  done(car.eventId);
}

/** Přihlášení do auta – sebe, nebo (vedoucí) kohokoli z kapely. */
export async function joinCar(carId: string, formData: FormData) {
  const car = await prisma.car.findUnique({ where: { id: carId }, include: { seatsTaken: true } });
  if (!car) throw new Error("Auto neexistuje.");
  const { user, event, manager } = await context(car.eventId);
  const passengerId = (manager && str(formData, "userId")) || user.id;
  if (passengerId === car.driverId) return;
  if (!(await prisma.bandMembership.findUnique({ where: { bandId_userId: { bandId: event.bandId, userId: passengerId } } }))) {
    throw new Error("Spolujezdec musí být členem kapely.");
  }
  if (await prisma.car.findFirst({ where: { eventId: car.eventId, driverId: passengerId } })) {
    throw new Error("Řidič jiného auta nemůže být spolujezdcem.");
  }
  const occupied = car.seatsTaken.filter((s) => s.userId !== passengerId).length;
  if (occupied >= car.seats) throw new Error("V autě už není volné místo.");

  await prisma.carSeat.upsert({
    where: { eventId_userId: { eventId: car.eventId, userId: passengerId } },
    update: { carId },
    create: { carId, eventId: car.eventId, userId: passengerId },
  });
  done(car.eventId);
}

export async function leaveCar(seatId: string) {
  const seat = await prisma.carSeat.findUnique({ where: { id: seatId }, include: { car: true } });
  if (!seat) return;
  const { user, manager } = await context(seat.eventId);
  if (!manager && seat.userId !== user.id && seat.car.driverId !== user.id) {
    throw new Error("Nemůžete odhlásit jiného spolujezdce.");
  }
  await prisma.carSeat.delete({ where: { id: seatId } });
  done(seat.eventId);
}
