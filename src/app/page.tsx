import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { isAdmin, visibleBandIds } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { EventCard } from "@/components/EventCard";
import { Empty, PageHeader } from "@/components/ui";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ past?: string }> }) {
  const user = await requireUser();
  const { past } = await searchParams;
  const showPast = past === "1";
  const bandIds = await visibleBandIds(user);
  const now = new Date(Date.now() - 12 * 3600 * 1000);

  const [events, memberships] = await Promise.all([
    prisma.event.findMany({
      where: { bandId: { in: bandIds }, startAt: showPast ? { lt: now } : { gte: now } },
      include: { band: true, attendances: { where: { userId: user.id } } },
      orderBy: { startAt: showPast ? "desc" : "asc" },
      take: 100,
    }),
    prisma.bandMembership.findMany({ where: { userId: user.id }, select: { bandId: true } }),
  ]);
  const memberOf = new Set(memberships.map((m) => m.bandId));
  const unanswered = events.filter(
    (e) => !showPast && memberOf.has(e.bandId) && e.status !== "CANCELLED" && e.attendances.length === 0,
  ).length;

  return (
    <div>
      <PageHeader
        title={showPast ? "Odehrané koncerty" : "Nadcházející koncerty"}
        subtitle={
          unanswered > 0 ? (
            <span className="font-semibold text-amber-700">⚠️ Čeká na vaši odpověď (můžete hrát?): {unanswered}</span>
          ) : undefined
        }
        actions={
          <Link href={showPast ? "/" : "/?past=1"} className="btn-secondary btn-sm">
            {showPast ? "Nadcházející" : "Historie"}
          </Link>
        }
      />
      {bandIds.length === 0 ? (
        <Empty>
          Zatím nejste v žádné kapele. {isAdmin(user) ? (
            <Link className="text-brand-600 underline" href="/bands/new">Založte první kapelu.</Link>
          ) : (
            "Požádejte organizátora o přidělení přístupu."
          )}
        </Empty>
      ) : events.length === 0 ? (
        <Empty>{showPast ? "Žádné odehrané akce." : "Žádné naplánované akce."}</Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              myStatus={event.attendances[0]?.status}
              showAttendance={memberOf.has(event.bandId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
