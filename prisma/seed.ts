// Ukázková data pro vývoj: npm run db:seed
import { PrismaClient } from "@prisma/client";
import { fromZonedTime } from "date-fns-tz";

const prisma = new PrismaClient();
const tz = process.env.APP_TIMEZONE || "Europe/Prague";

function inDays(days: number, time: string) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const date = d.toISOString().slice(0, 10);
  return fromZonedTime(`${date}T${time}`, tz);
}

async function main() {
  if (process.env.VERCEL_ENV === "production") throw new Error("Testovací data se do ostré verze nenahrávají.");
  const adminEmail = (process.env.ADMIN_EMAILS || "organizator@example.com").split(",")[0].trim().toLowerCase();
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: { email: adminEmail, name: "Organizátor", role: "ADMIN" },
  });

  const people = [
    { email: "petr@example.com", name: "Petr Novák", phone: "+420 777 111 222" },
    { email: "jana@example.com", name: "Jana Dvořáková", phone: "+420 777 333 444" },
    { email: "tomas@example.com", name: "Tomáš Svoboda", phone: "+420 777 555 666" },
    { email: "eva@example.com", name: "Eva Černá", phone: "+420 777 777 888" },
    { email: "martin@example.com", name: "Martin Zeman", phone: "+420 777 999 000" },
  ];
  const users = await Promise.all(
    people.map((p) => prisma.user.upsert({ where: { email: p.email }, update: {}, create: p })),
  );
  const [petr, jana, tomas, eva, martin] = users;

  await prisma.band.deleteMany({ where: { name: { in: ["Rocková Smršť", "Swing Band Praha"] } } });

  const rock = await prisma.band.create({
    data: {
      name: "Rocková Smršť",
      color: "#e11d48",
      description: "Rocková kapela – kluby a festivaly",
      memberships: {
        create: [
          { userId: petr.id, role: "LEADER", instrument: "kytara", defaultPay: 3000 },
          { userId: jana.id, role: "MEMBER", instrument: "zpěv", defaultPay: 2500 },
          { userId: tomas.id, role: "MEMBER", instrument: "bicí", defaultPay: 2500 },
          { userId: eva.id, role: "MEMBER", instrument: "baskytara", defaultPay: 2500 },
          { userId: martin.id, role: "SUBSTITUTE", instrument: "bicí", defaultPay: 2000 },
        ],
      },
    },
  });
  await prisma.band.create({
    data: {
      name: "Swing Band Praha",
      color: "#0ea5e9",
      memberships: {
        create: [
          { userId: jana.id, role: "LEADER", instrument: "zpěv" },
          { userId: martin.id, role: "MEMBER", instrument: "bicí" },
        ],
      },
    },
  });

  const core = [
    { instrument: "kytara", userId: petr.id, pay: 3000 },
    { instrument: "zpěv", userId: jana.id, pay: 2500 },
    { instrument: "bicí", userId: tomas.id, pay: 2500 },
    { instrument: "baskytara", userId: eva.id, pay: 2500 },
  ];

  const festival = await prisma.event.create({
    data: {
      bandId: rock.id,
      title: "Letní festival",
      status: "CONFIRMED",
      venueName: "Amfiteátr Lipnice",
      venueAddress: "Lipnice nad Sázavou 1, 582 32",
      meetingPoint: "Zkušebna, Holešovice",
      departureAt: inDays(10, "13:00"),
      getInAt: inDays(10, "15:00"),
      soundcheckAt: inDays(10, "16:00"),
      startAt: inDays(10, "20:30"),
      endAt: inDays(10, "22:00"),
      contactName: "Karel (produkce)",
      contactPhone: "+420 600 100 200",
      fee: "15 000 Kč",
      dressCode: "černá trička",
      setlist: "1. Intro\n2. Smršť\n3. Noc\n4. Přídavek",
      createdById: admin.id,
      lineup: { create: core.map((c, i) => ({ ...c, sortOrder: i })) },
      attendances: {
        create: [
          { userId: petr.id, status: "YES" },
          { userId: jana.id, status: "YES" },
          { userId: tomas.id, status: "NO", note: "dovolená" },
        ],
      },
    },
  });
  const car = await prisma.car.create({
    data: { eventId: festival.id, driverId: petr.id, label: "Transit (aparát)", seats: 2, departureAt: festival.departureAt, departFrom: "Zkušebna" },
  });
  await prisma.carSeat.create({ data: { carId: car.id, eventId: festival.id, userId: jana.id } });

  await prisma.event.create({
    data: {
      bandId: rock.id,
      title: "Klubový koncert",
      status: "PLANNED",
      venueName: "Klub Rock Café",
      venueAddress: "Národní 20, Praha 1",
      getInAt: inDays(24, "18:00"),
      soundcheckAt: inDays(24, "18:30"),
      startAt: inDays(24, "21:00"),
      createdById: admin.id,
      lineup: { create: core.map((c, i) => ({ ...c, sortOrder: i })) },
    },
  });

  await prisma.event.create({
    data: {
      bandId: rock.id,
      title: "Zářijový klub",
      status: "CONFIRMED",
      venueName: "Lucerna Music Bar",
      venueAddress: "Vodičkova 36, Praha 1",
      startAt: inDays(-14, "21:00"),
      fee: "12 000 Kč",
      createdById: admin.id,
      lineup: {
        create: core.map((c, i) => ({ ...c, sortOrder: i, paidAt: i < 2 ? new Date() : null })),
      },
    },
  });

  await prisma.poll.create({
    data: {
      bandId: rock.id,
      eventId: festival.id,
      question: "Kdy se sejdeme na zkoušku před festivalem?",
      createdById: petr.id,
      options: { create: [{ text: "Úterý 18:00", sortOrder: 0 }, { text: "Středa 19:00", sortOrder: 1 }] },
    },
  });

  console.log(`Seed hotov. Organizátor: ${adminEmail}, členové: ${people.map((p) => p.email).join(", ")}`);
}

main().finally(() => prisma.$disconnect());
