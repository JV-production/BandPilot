// Import koncertů z existujícího Google Kalendáře do kapely.
import type { calendar_v3 } from "googleapis";
import { fromZonedTime } from "date-fns-tz";
import { ensureWatch, eventLocation } from "./band-calendar";
import { calendarClientFor, removeEventFromCalendars, syncEventToCalendars } from "./google-calendar";
import { defaultLineup } from "./lineup";
import { prisma } from "./prisma";
import { TIMEZONE } from "./time";

export type ImportedFields = {
  externalId: string;
  title: string;
  startAt: Date;
  endAt: Date | null;
  venueName: string | null;
  venueAddress: string | null;
  notes: string | null;
  cancelled: boolean;
};

/** Převod události z Google Kalendáře na pole koncertu. Vrací null pro události, které se nemají importovat. */
export function mapGoogleEvent(e: calendar_v3.Schema$Event): ImportedFields | null {
  if (!e.id) return null;
  // Události, které do kalendářů zapisuje sám BandPilot, nikdy neimportujeme zpět.
  if (e.extendedProperties?.private?.bandpilotEventId) return null;

  const cancelled = e.status === "cancelled";
  let startAt: Date | null = null;
  let endAt: Date | null = null;
  let note: string | null = null;

  if (e.start?.dateTime) {
    startAt = new Date(e.start.dateTime);
    endAt = e.end?.dateTime ? new Date(e.end.dateTime) : null;
  } else if (e.start?.date) {
    // Celodenní událost – čas neznáme, nastavíme 20:00 a upozorníme.
    startAt = fromZonedTime(`${e.start.date}T20:00`, TIMEZONE);
    note = "Celodenní událost v kalendáři – upřesněte čas začátku.";
  }
  if (!startAt || Number.isNaN(startAt.getTime())) {
    return cancelled ? { externalId: e.id, title: "", startAt: new Date(0), endAt: null, venueName: null, venueAddress: null, notes: null, cancelled } : null;
  }

  const location = e.location?.trim() || null;
  const venueName = location && location.includes(",") ? location.split(",")[0].trim() : null;
  const description = e.description?.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim() || null;

  return {
    externalId: e.id,
    title: e.summary?.trim() || "Koncert",
    startAt,
    endAt,
    venueName,
    venueAddress: location,
    notes: [description, note].filter(Boolean).join("\n\n") || null,
    cancelled,
  };
}

export type ImportResult = { created: number; updated: number; cancelled: number };

const LOCK_MS = 2 * 60 * 1000;

/** Načte budoucí události ze zdrojového kalendáře kapely a vytvoří/aktualizuje koncerty.
 *  Běží vždy jen jednou současně (zámek v databázi) – souběžné spuštění se přeskočí. */
type ImportOptions = {
  /** Předá aktualizaci osobních kalendářů volajícímu (např. do after() v server action). */
  deferSync?: (task: () => Promise<void>) => void;
};

export async function importBandCalendar(bandId: string, opts: ImportOptions = {}): Promise<ImportResult> {
  const now = new Date();
  const claimed = await prisma.band.updateMany({
    where: { id: bandId, OR: [{ importLockUntil: null }, { importLockUntil: { lt: now } }] },
    data: { importLockUntil: new Date(now.getTime() + LOCK_MS) },
  });
  if (claimed.count === 0) return { created: 0, updated: 0, cancelled: 0 };
  try {
    return await runImport(bandId, opts);
  } finally {
    await prisma.band.update({ where: { id: bandId }, data: { importLockUntil: null } });
  }
}

type EventWithCounts = { id: string; createdAt: Date; _count: { attendances: number; cars: number; polls: number } };
const score = (e: EventWithCounts) => e._count.attendances + e._count.cars + e._count.polls;
const countsInclude = { _count: { select: { attendances: true, cars: true, polls: true } } } as const;

/** Přesune odpovědi, auta a ankety z akce `dropId` na `keepId` a `dropId` smaže (i z kalendářů členů). */
export async function mergeEvents(keepId: string, dropId: string) {
  const keepAnswers = new Set((await prisma.attendance.findMany({ where: { eventId: keepId } })).map((a) => a.userId));
  for (const a of await prisma.attendance.findMany({ where: { eventId: dropId } })) {
    if (keepAnswers.has(a.userId)) await prisma.attendance.delete({ where: { id: a.id } });
    else await prisma.attendance.update({ where: { id: a.id }, data: { eventId: keepId } });
  }
  await prisma.poll.updateMany({ where: { eventId: dropId }, data: { eventId: keepId } });

  const keepDrivers = new Set((await prisma.car.findMany({ where: { eventId: keepId } })).map((c) => c.driverId));
  const keepSeated = new Set((await prisma.carSeat.findMany({ where: { eventId: keepId } })).map((s) => s.userId));
  for (const car of await prisma.car.findMany({ where: { eventId: dropId }, include: { seatsTaken: true } })) {
    if (keepDrivers.has(car.driverId) || keepSeated.has(car.driverId)) {
      await prisma.car.delete({ where: { id: car.id } });
      continue;
    }
    for (const seat of car.seatsTaken) {
      if (keepSeated.has(seat.userId) || keepDrivers.has(seat.userId)) await prisma.carSeat.delete({ where: { id: seat.id } });
      else {
        await prisma.carSeat.update({ where: { id: seat.id }, data: { eventId: keepId } });
        keepSeated.add(seat.userId);
      }
    }
    await prisma.car.update({ where: { id: car.id }, data: { eventId: keepId } });
    keepDrivers.add(car.driverId);
  }

  await removeEventFromCalendars(dropId);
  await prisma.event.delete({ where: { id: dropId } });
}

/** Sloučí skupinu stejných akcí do jedné. `preferred` = ID akcí, které mají přednost (např. platné v kalendáři). */
async function mergeGroup(events: (EventWithCounts & { externalId: string | null })[], preferred?: Set<string>) {
  const ranked = [...events].sort(
    (a, b) =>
      Number(!!preferred && !!b.externalId && preferred.has(b.externalId)) -
        Number(!!preferred && !!a.externalId && preferred.has(a.externalId)) ||
      score(b) - score(a) ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const [keep, ...drop] = ranked;
  for (const d of drop) await mergeEvents(keep.id, d.id);
  return drop.length;
}

/** Sloučí zdvojené importované akce se stejným ID v kalendáři. */
export async function dedupeImported(bandId: string): Promise<number> {
  const dups = await prisma.event.groupBy({
    by: ["externalId"],
    where: { bandId, externalId: { not: null } },
    _count: { _all: true },
    having: { externalId: { _count: { gt: 1 } } },
  });
  let removed = 0;
  for (const d of dups) {
    const events = await prisma.event.findMany({ where: { bandId, externalId: d.externalId }, include: countsInclude });
    removed += await mergeGroup(events);
  }
  return removed;
}

/** Stejný koncert = stejný název a stejný začátek. */
export const sameEventKey = (title: string, startAt: Date) => `${title.trim().toLowerCase()}|${startAt.getTime()}`;

async function runImport(bandId: string, opts: ImportOptions): Promise<ImportResult> {
  const band = await prisma.band.findUnique({ where: { id: bandId } });
  if (!band?.importCalendarId || !band.importOwnerId) throw new Error("Kapela nemá nastavený kalendář pro import.");
  await dedupeImported(bandId);

  const calendar = await calendarClientFor(band.importOwnerId);
  if (!calendar) throw new Error("Účet, který import nastavil, nemá propojený Google Kalendář. Přihlaste se znovu přes Google.");

  const timeMin = new Date(Date.now() - 24 * 3600 * 1000);
  const items: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  do {
    const res = await calendar.events.list({
      calendarId: band.importCalendarId,
      timeMin: timeMin.toISOString(),
      timeMax: new Date(Date.now() + 2 * 365 * 24 * 3600 * 1000).toISOString(),
      singleEvents: true,
      showDeleted: true,
      maxResults: 250,
      pageToken,
    });
    items.push(...(res.data.items ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken && items.length < 2000);

  const mapped = items.map(mapGoogleEvent).filter((f): f is ImportedFields => !!f);
  // Když je v kalendáři stejný koncert vícekrát (stejný název i začátek), bereme ho jen jednou.
  const live: ImportedFields[] = [];
  const liveKeys = new Set<string>();
  for (const f of mapped) {
    if (f.cancelled) continue;
    const key = sameEventKey(f.title, f.startAt);
    if (liveKeys.has(key)) continue;
    liveKeys.add(key);
    live.push(f);
  }
  const liveIds = new Set(live.map((f) => f.externalId));

  const result: ImportResult = { created: 0, updated: 0, cancelled: 0 };
  const touched = new Set<string>();

  for (const f of live) {
    let existing = await prisma.event.findFirst({ where: { bandId, externalId: f.externalId } });
    if (!existing) {
      // Stejný koncert už v kapele je (z jiného kalendáře, dřívějšího importu nebo založený ručně) – připojíme ho, nezakládáme nový.
      const twin = await prisma.event.findFirst({
        where: {
          bandId,
          title: f.title,
          startAt: f.startAt,
          OR: [{ externalId: null }, { externalId: { notIn: [...liveIds] } }],
        },
        orderBy: { createdAt: "asc" },
      });
      if (twin) {
        existing = await prisma.event.update({ where: { id: twin.id }, data: { externalId: f.externalId } });
        touched.add(twin.id);
      }
    }

    if (!existing) {
      const created = await prisma.event.create({
        data: {
          bandId,
          externalId: f.externalId,
          title: f.title,
          status: "CONFIRMED",
          startAt: f.startAt,
          endAt: f.endAt,
          venueName: f.venueName,
          venueAddress: f.venueAddress,
          notes: f.notes,
          createdById: band.importOwnerId,
          lineup: { create: await defaultLineup(bandId) },
        },
      });
      result.created++;
      touched.add(created.id);
      continue;
    }

    // Kalendář je zdrojem pravdy pro název, čas a místo; ostatní (odjezd, zvukovka, sestava…) se nemění.
    const locationChanged = eventLocation(existing) !== f.venueAddress;
    const changed =
      locationChanged ||
      existing.status === "CANCELLED" ||
      existing.title !== f.title ||
      existing.startAt.getTime() !== f.startAt.getTime() ||
      (existing.endAt?.getTime() ?? null) !== (f.endAt?.getTime() ?? null);
    if (changed) {
      await prisma.event.update({
        where: { id: existing.id },
        data: {
          title: f.title,
          startAt: f.startAt,
          endAt: f.endAt,
          ...(existing.status === "CANCELLED" ? { status: "CONFIRMED" } : {}),
          ...(locationChanged ? { venueAddress: f.venueAddress, venueName: f.venueName } : {}),
        },
      });
      result.updated++;
      touched.add(existing.id);
    }
  }

  // Sloučit zbylé dvojice v kapele (stejný název + začátek); přednost má akce platná v kalendáři.
  const upcoming = await prisma.event.findMany({
    where: { bandId, startAt: { gte: timeMin }, status: { not: "CANCELLED" } },
    include: countsInclude,
  });
  const groups = new Map<string, typeof upcoming>();
  for (const e of upcoming) {
    const key = sameEventKey(e.title, e.startAt);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  for (const group of groups.values()) {
    if (group.length < 2 || !group.some((e) => e.externalId)) continue;
    await mergeGroup(group, liveIds);
  }

  // Importované akce, které v kalendáři už nejsou (smazané), označíme jako zrušené – nic nemažeme.
  const stale = await prisma.event.findMany({
    where: { bandId, startAt: { gte: timeMin }, status: { not: "CANCELLED" }, externalId: { not: null } },
    select: { id: true, externalId: true },
  });
  for (const e of stale) {
    if (e.externalId && !liveIds.has(e.externalId)) {
      await prisma.event.update({ where: { id: e.id }, data: { status: "CANCELLED" } });
      result.cancelled++;
      touched.add(e.id);
    }
  }

  await prisma.band.update({ where: { id: bandId }, data: { importedAt: new Date(), importError: null } });

  // Osobní kalendáře členů; navíc odstraníme dřívější osobní kopie organizátora, který kalendář kapely už má.
  const ownerCopies = await prisma.calendarLink.findMany({
    where: { userId: band.importOwnerId, event: { bandId, externalId: { not: null } } },
    select: { eventId: true },
  });
  const existingIds = new Set(
    (await prisma.event.findMany({ where: { id: { in: [...touched] } }, select: { id: true } })).map((e) => e.id),
  );
  const toSync = [...new Set([...[...touched].filter((id) => existingIds.has(id)), ...ownerCopies.map((l) => l.eventId)])];
  const syncAll = async () => {
    for (const id of toSync) await syncEventToCalendars(id);
  };
  if (toSync.length) {
    if (opts.deferSync) opts.deferSync(syncAll);
    else await syncAll();
  }
  return result;
}

/** Import s uložením chyby ke kapele (pro automatické spouštění). */
export async function importBandCalendarSafe(bandId: string, opts: ImportOptions = {}) {
  try {
    return await importBandCalendar(bandId, opts);
  } catch (err) {
    const message = describeError(err);
    console.error("[calendar-import]", bandId, message);
    await prisma.band.update({ where: { id: bandId }, data: { importedAt: new Date(), importError: message } });
    return null;
  }
}

export function describeError(err: unknown): string {
  const code = (err as { code?: number })?.code;
  if (code === 404) return "Kalendář nebyl nalezen. Zkontrolujte ID kalendáře a že k němu máte přístup.";
  if (code === 401 || code === 403) return "Google odmítl přístup ke kalendáři. Přihlaste se znovu přes Google a povolte kalendář.";
  return (err as Error)?.message || "Neznámá chyba při načítání kalendáře.";
}

const AUTO_IMPORT_EVERY_MS = 30 * 60 * 1000;

/** U kapel s propojeným kalendářem: načte změny, pokud dlouho neproběhly, a udrží aktivní push notifikace. */
export async function autoImportStale(bandIds?: string[]) {
  const bands = await prisma.band.findMany({
    where: { importCalendarId: { not: null }, ...(bandIds ? { id: { in: bandIds } } : {}) },
    select: { id: true, importedAt: true },
  });
  for (const b of bands) {
    if (!b.importedAt || Date.now() - b.importedAt.getTime() > AUTO_IMPORT_EVERY_MS) await importBandCalendarSafe(b.id);
    await ensureWatch(b.id);
  }
}
