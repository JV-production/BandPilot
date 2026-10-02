import { google } from "googleapis";
import { prisma } from "./prisma";
import {
  calendarDescription,
  calendarEnd,
  calendarRecipients,
  calendarStart,
  calendarTitle,
  eventFullInclude,
  type FullEvent,
} from "./event-details";
import { appBaseUrl } from "./env";
import { TIMEZONE } from "./time";

export const appUrl = appBaseUrl;

export async function calendarClientFor(userId: string) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return null;
  const account = await prisma.account.findFirst({ where: { userId, provider: "google" } });
  if (!account?.refresh_token && !account?.access_token) return null;
  if (account.scope && !account.scope.includes("calendar")) return null;

  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  auth.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });
  auth.on("tokens", (tokens) => {
    void prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: tokens.access_token ?? undefined,
        expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : undefined,
        ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
      },
    });
  });
  return google.calendar({ version: "v3", auth });
}

function googleEventBody(event: FullEvent, userId: string) {
  const location = [event.venueName, event.venueAddress].filter(Boolean).join(", ");
  return {
    summary: calendarTitle(event),
    location: location || undefined,
    description: calendarDescription(event, userId, appUrl()),
    start: { dateTime: calendarStart(event, userId).toISOString(), timeZone: TIMEZONE },
    end: { dateTime: calendarEnd(event).toISOString(), timeZone: TIMEZONE },
    status: event.status === "PLANNED" ? "tentative" : "confirmed",
    colorId: event.status === "CANCELLED" ? "11" : event.status === "PLANNED" ? "5" : "10",
    source: { title: "BandPilot", url: `${appUrl()}/events/${event.id}` },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 24 * 60 },
        { method: "popup", minutes: 120 },
      ],
    },
    extendedProperties: { private: { bandpilotEventId: event.id } },
  };
}

function isGone(err: unknown) {
  const code = (err as { code?: number })?.code;
  return code === 404 || code === 410;
}

async function upsertForUser(event: FullEvent, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.calendarSync) return;
  const calendar = await calendarClientFor(userId);
  if (!calendar) return;

  const link = await prisma.calendarLink.findUnique({ where: { eventId_userId: { eventId: event.id, userId } } });
  const requestBody = googleEventBody(event, userId);

  if (link) {
    try {
      await calendar.events.update({ calendarId: "primary", eventId: link.googleEventId, requestBody });
      await prisma.calendarLink.update({ where: { id: link.id }, data: { syncedAt: new Date() } });
      return;
    } catch (err) {
      if (!isGone(err)) throw err;
      // Uživatel událost v kalendáři smazal – vytvoříme ji znovu.
      await prisma.calendarLink.delete({ where: { id: link.id } });
    }
  }
  const created = await calendar.events.insert({ calendarId: "primary", requestBody });
  if (created.data.id) {
    await prisma.calendarLink.create({ data: { eventId: event.id, userId, googleEventId: created.data.id } });
  }
}

async function removeForUser(eventId: string, userId: string) {
  const link = await prisma.calendarLink.findUnique({ where: { eventId_userId: { eventId, userId } } });
  if (!link) return;
  const calendar = await calendarClientFor(userId);
  if (calendar) {
    try {
      await calendar.events.delete({ calendarId: "primary", eventId: link.googleEventId });
    } catch (err) {
      if (!isGone(err)) throw err;
    }
  }
  await prisma.calendarLink.delete({ where: { id: link.id } });
}

/** Propíše akci do Google Kalendářů všech dotčených členů. Chyby jednotlivých uživatelů jen zaloguje. */
export async function syncEventToCalendars(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, include: eventFullInclude });
  if (!event) return;
  const recipients = new Set(calendarRecipients(event));
  const linked = await prisma.calendarLink.findMany({ where: { eventId }, select: { userId: true } });
  const toRemove = linked.map((l) => l.userId).filter((id) => !recipients.has(id));

  const results = await Promise.allSettled([
    ...[...recipients].map((userId) => upsertForUser(event, userId)),
    ...toRemove.map((userId) => removeForUser(eventId, userId)),
  ]);
  for (const r of results) {
    if (r.status === "rejected") console.error("[calendar] sync failed:", r.reason?.message ?? r.reason);
  }
}

/** Před smazáním akce odstraní události ze všech kalendářů. */
export async function removeEventFromCalendars(eventId: string) {
  const links = await prisma.calendarLink.findMany({ where: { eventId } });
  await Promise.allSettled(links.map((l) => removeForUser(eventId, l.userId)));
}

/** Synchronizuje všechny nadcházející akce daného uživatele (např. po zapnutí synchronizace). */
export async function syncUpcomingForUser(userId: string) {
  const bandIds = (await prisma.bandMembership.findMany({ where: { userId } })).map((m) => m.bandId);
  const events = await prisma.event.findMany({
    where: { bandId: { in: bandIds }, startAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
    select: { id: true },
  });
  for (const e of events) await syncEventToCalendars(e.id);
}

export async function hasGoogleCalendar(userId: string) {
  const account = await prisma.account.findFirst({ where: { userId, provider: "google" } });
  return !!account && (!account.scope || account.scope.includes("calendar"));
}
