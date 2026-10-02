import Link from "next/link";
import { BellRing, CalendarX2, Music2, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { isAdmin, visibleBandIds } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { fmt } from "@/lib/time";
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
  );

  // Seskupení podle měsíců
  const groups: { label: string; items: typeof events }[] = [];
  for (const e of events) {
    const label = fmt(e.startAt, "LLLL yyyy");
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(e);
    else groups.push({ label, items: [e] });
  }

  const firstName = (user.name || "").split(" ")[0];

  return (
    <div>
      <PageHeader
        title={showPast ? "Historie" : firstName ? `Ahoj, ${firstName}` : "Koncerty"}
        subtitle={showPast ? "Odehrané koncerty" : `${events.length} nadcházejících akcí`}
      />

      {/* Přepínač nadcházející / historie */}
      <div className="mb-6 inline-flex rounded-full bg-surface-2 p-1 text-sm font-semibold">
        <Link href="/" className={`rounded-full px-4 py-1.5 transition ${!showPast ? "bg-surface text-ink shadow-sm" : "text-ink-3"}`}>
          Nadcházející
        </Link>
        <Link href="/?past=1" className={`rounded-full px-4 py-1.5 transition ${showPast ? "bg-surface text-ink shadow-sm" : "text-ink-3"}`}>
          Historie
        </Link>
      </div>

      {unanswered.length > 0 && (
        <Link
          href={`/events/${unanswered[0].id}`}
          className="mb-6 flex items-center gap-3 rounded-3xl bg-gradient-to-br from-brand to-brand-2 p-4 text-white shadow-glow"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <BellRing className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Čeká na tvoji odpověď</span>
            <span className="block truncate text-sm text-white/85">
              {unanswered.length === 1 ? unanswered[0].title : `${unanswered.length} akcí – můžeš hrát?`}
            </span>
          </span>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-brand">Odpovědět</span>
        </Link>
      )}

      {bandIds.length === 0 ? (
        <Empty icon={Music2}>
          Zatím nejste v žádné kapele.{" "}
          {isAdmin(user) ? (
            <Link className="link" href="/bands/new">
              Založte první kapelu.
            </Link>
          ) : (
            "Požádejte organizátora o přidělení přístupu."
          )}
        </Empty>
      ) : events.length === 0 ? (
        <Empty icon={CalendarX2}>{showPast ? "Žádné odehrané akce." : "Žádné naplánované akce."}</Empty>
      ) : (
        <div className="space-y-7">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="section-title">{g.label}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {g.items.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    myStatus={event.attendances[0]?.status}
                    showAttendance={memberOf.has(event.bandId)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {isAdmin(user) && bandIds.length > 0 && (
        <Link href="/bands" className="btn-outline mt-8 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Nová akce – vyber kapelu
        </Link>
      )}
    </div>
  );
}
