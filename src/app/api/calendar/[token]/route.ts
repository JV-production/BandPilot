import { eventFullInclude, calendarRecipients } from "@/lib/event-details";
import { appUrl } from "@/lib/google-calendar";
import { buildIcs } from "@/lib/ics";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** iCal feed konkrétního uživatele (tajný token v URL). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await prisma.user.findUnique({
    where: { calendarToken: token.replace(/\.ics$/, "") },
    include: { memberships: true },
  });
  if (!user) return new Response("Not found", { status: 404 });

  const events = await prisma.event.findMany({
    where: {
      bandId: { in: user.memberships.map((m) => m.bandId) },
      startAt: { gte: new Date(Date.now() - 60 * 24 * 3600 * 1000) },
    },
    include: eventFullInclude,
    orderBy: { startAt: "asc" },
  });
  const mine = events.filter((e) => calendarRecipients(e).includes(user.id));

  return new Response(buildIcs(mine, user.id, appUrl(), "BandPilot – koncerty"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="bandpilot.ics"',
      "Cache-Control": "no-store",
    },
  });
}
