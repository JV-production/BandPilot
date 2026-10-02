// Propojení kapely s jejím Google Kalendářem – JEN pro čtení (kalendář → aplikace).
// Aplikace do kalendáře kapely nic nezapisuje; Google jí jen posílá notifikace o změnách.
import { randomUUID } from "node:crypto";
import { appBaseUrl } from "./env";
import { calendarClientFor } from "./google-calendar";
import { prisma } from "./prisma";

/** Místo akce jako jeden text – pro porovnání s polem „místo“ v kalendáři při importu. */
export function eventLocation(e: { venueName: string | null; venueAddress: string | null }): string | null {
  if (e.venueName && e.venueAddress) {
    return e.venueAddress.startsWith(e.venueName) ? e.venueAddress : `${e.venueName}, ${e.venueAddress}`;
  }
  return e.venueAddress || e.venueName || null;
}

async function bandCalendar(bandId: string) {
  const band = await prisma.band.findUnique({ where: { id: bandId } });
  if (!band?.importCalendarId || !band.importOwnerId) return null;
  const client = await calendarClientFor(band.importOwnerId);
  return client ? { band, client, calendarId: band.importCalendarId } : null;
}

// ---------- Push notifikace (Google → aplikace) ----------

const WATCH_TTL_S = 7 * 24 * 3600;
const RENEW_BEFORE_MS = 2 * 24 * 3600 * 1000;

export async function stopWatch(bandId: string) {
  const band = await prisma.band.findUnique({ where: { id: bandId } });
  if (!band?.watchChannelId || !band.watchResourceId || !band.importOwnerId) return;
  const client = await calendarClientFor(band.importOwnerId);
  try {
    await client?.channels.stop({ requestBody: { id: band.watchChannelId, resourceId: band.watchResourceId } });
  } catch {
    // kanál už mohl vypršet
  }
  await prisma.band.update({
    where: { id: bandId },
    data: { watchChannelId: null, watchResourceId: null, watchToken: null, watchExpiresAt: null },
  });
}

/** Zajistí, že Google posílá notifikace o změnách v kalendáři kapely (obnoví před vypršením). */
export async function ensureWatch(bandId: string) {
  const base = appBaseUrl();
  if (!base.startsWith("https://")) return; // lokální vývoj – Google umí volat jen veřejnou HTTPS adresu
  const band = await prisma.band.findUnique({ where: { id: bandId } });
  if (!band?.importCalendarId) return;
  if (band.watchExpiresAt && band.watchExpiresAt.getTime() - Date.now() > RENEW_BEFORE_MS) return;

  const ctx = await bandCalendar(bandId);
  if (!ctx) return;
  await stopWatch(bandId);
  const id = randomUUID();
  const token = randomUUID();
  try {
    const res = await ctx.client.events.watch({
      calendarId: ctx.calendarId,
      requestBody: { id, token, type: "web_hook", address: `${base}/api/calendar/webhook`, params: { ttl: String(WATCH_TTL_S) } },
    });
    await prisma.band.update({
      where: { id: bandId },
      data: {
        watchChannelId: id,
        watchToken: token,
        watchResourceId: res.data.resourceId ?? null,
        watchExpiresAt: res.data.expiration ? new Date(Number(res.data.expiration)) : new Date(Date.now() + WATCH_TTL_S * 1000),
      },
    });
  } catch (err) {
    // Bez notifikací synchronizace dál funguje (při otevření aplikace a denně) – jen chybu zalogujeme.
    console.error("[band-calendar] watch failed", bandId, (err as Error)?.message);
  }
}
