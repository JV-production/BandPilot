import { after } from "next/server";
import { importBandCalendarSafe } from "@/lib/calendar-import";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Push notifikace od Googlu: v kalendáři kapely se něco změnilo → hned načíst. */
export async function POST(req: Request) {
  const channelId = req.headers.get("x-goog-channel-id");
  const token = req.headers.get("x-goog-channel-token");
  const state = req.headers.get("x-goog-resource-state");
  if (!channelId || !token) return new Response(null, { status: 400 });

  const band = await prisma.band.findFirst({ where: { watchChannelId: channelId, watchToken: token } });
  if (!band) return new Response(null, { status: 404 });

  // "sync" je jen úvodní potvrzení kanálu, změny přicházejí jako "exists".
  if (state !== "sync") after(() => importBandCalendarSafe(band.id));
  return new Response(null, { status: 200 });
}
