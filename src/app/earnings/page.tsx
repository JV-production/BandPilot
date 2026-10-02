import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatCzk, summarizePay, type PaySummary } from "@/lib/earnings";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { fmt, fmtShortDate, TIMEZONE } from "@/lib/time";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarClock, ChevronLeft, ChevronRight, History, Users } from "lucide-react";
import { BandDot, Empty, PageHeader, SectionTitle, StatusBadge, personName } from "@/components/ui";

export const metadata = { title: "Honoráře" };

function yearRange(year: number) {
  // Hranice roku v časovém pásmu kapely (přibližně – stačí pro filtr).
  return { gte: new Date(`${year}-01-01T00:00:00Z`), lt: new Date(`${year + 1}-01-01T00:00:00Z`) };
}

function SummaryTiles({ s }: { s: PaySummary }) {
  const tiles = [
    { label: "Vyplaceno", value: s.paid },
    { label: "Doplatit", value: s.outstanding, highlight: s.outstanding > 0 },
    { label: "Nadcházející", value: s.upcoming, sub: `${s.upcomingCount} akcí` },
  ];
  return (
    <div className="space-y-3">
      <div className="rounded-3xl bg-gradient-to-br from-brand to-brand-2 p-5 text-white shadow-glow">
        <div className="text-sm font-medium text-white/80">Odehráno</div>
        <div className="font-display text-[2.6rem] font-black leading-tight">{formatCzk(s.played)}</div>
        <div className="text-sm text-white/80">{s.playedCount} akcí</div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className={`card p-3 sm:p-4 ${t.highlight ? "border-warn/40 bg-warn-soft" : ""}`}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">{t.label}</div>
            <div className={`mt-1 font-display text-lg font-black leading-tight ${t.highlight ? "text-warn" : ""}`}>{formatCzk(t.value)}</div>
            {t.sub && <div className="text-[11px] text-ink-3">{t.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function EarningsPage({ searchParams }: { searchParams: Promise<{ year?: string; user?: string }> }) {
  const me = await requireUser();
  const admin = isAdmin(me);
  const params = await searchParams;
  const currentYear = Number(formatInTimeZone(new Date(), TIMEZONE, "yyyy"));
  const year = Number(params.year) || currentYear;
  // Organizátor si může zobrazit přehled kohokoli, ostatní jen sebe.
  const targetId = admin && params.user ? params.user : me.id;
  const target = targetId === me.id ? me : await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return <Empty>Uživatel neexistuje.</Empty>;

  const slots = await prisma.lineupSlot.findMany({
    where: { userId: target.id, event: { startAt: yearRange(year) } },
    include: { event: { include: { band: true } } },
    orderBy: { event: { startAt: "asc" } },
  });
  const summary = summarizePay(slots);
  const now = new Date();
  const upcoming = slots.filter((s) => s.event.startAt >= now);
  const played = slots.filter((s) => s.event.startAt < now).reverse();

  // Přehled všech hráčů pro organizátora
  const allSlots = admin
    ? await prisma.lineupSlot.findMany({
        where: { userId: { not: null }, event: { startAt: yearRange(year) } },
        include: { event: true, user: true },
      })
    : [];
  const byPlayer = new Map<string, { name: string; slots: typeof allSlots }>();
  for (const s of allSlots) {
    if (!s.user) continue;
    const entry = byPlayer.get(s.user.id) ?? { name: personName(s.user), slots: [] };
    entry.slots.push(s);
    byPlayer.set(s.user.id, entry);
  }
  const players = [...byPlayer.entries()]
    .map(([id, p]) => ({ id, name: p.name, s: summarizePay(p.slots) }))
    .sort((a, b) => a.name.localeCompare(b.name, "cs"));

  const link = (y: number, u?: string) => `/earnings?year=${y}${u && u !== me.id ? `&user=${u}` : ""}`;

  const Row = ({ slot }: { slot: (typeof slots)[number] }) => (
    <Link href={`/events/${slot.event.id}`} className="list-row justify-between hover:bg-surface-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <BandDot color={slot.event.band.color} /> {slot.event.band.name} · {fmtShortDate(slot.event.startAt)}
        </div>
        <div className={`truncate font-semibold ${slot.event.status === "CANCELLED" ? "line-through text-ink-3" : ""}`}>
          {slot.event.title}
        </div>
        <div className="text-xs text-ink-3">{slot.instrument}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-display font-black">{slot.event.status === "CANCELLED" ? "—" : formatCzk(slot.pay)}</div>
        {slot.event.status === "CANCELLED" ? (
          <StatusBadge status="CANCELLED" />
        ) : slot.event.startAt < now ? (
          <span className={`badge ${slot.paidAt ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>
            {slot.paidAt ? `vyplaceno ${fmt(slot.paidAt, "d. M.")}` : "čeká na výplatu"}
          </span>
        ) : null}
      </div>
    </Link>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={target.id === me.id ? "Moje honoráře" : `Honoráře – ${personName(target)}`}
        subtitle="Tyto částky vidíš jen ty a organizátor."
        back={target.id !== me.id ? { href: link(year), label: "Moje honoráře" } : undefined}
        actions={
          <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
            <Link href={link(year - 1, target.id)} className="btn-icon min-h-[32px] w-8 bg-surface" aria-label="Předchozí rok">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="px-2 font-display font-black tabular-nums">{year}</span>
            <Link href={link(year + 1, target.id)} className="btn-icon min-h-[32px] w-8 bg-surface" aria-label="Další rok">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <SummaryTiles s={summary} />
      {summary.unsetCount > 0 && (
        <p className="text-xs text-ink-3">U {summary.unsetCount} akcí zatím není honorář určen (počítá se jako 0 Kč).</p>
      )}

      <section>
        <SectionTitle icon={CalendarClock}>Nadcházející</SectionTitle>
        {upcoming.length === 0 ? (
          <Empty>Žádné nadcházející akce v sestavě.</Empty>
        ) : (
          <div className="list">{upcoming.map((s) => <Row key={s.id} slot={s} />)}</div>
        )}
      </section>

      <section>
        <SectionTitle icon={History}>Odehráno</SectionTitle>
        {played.length === 0 ? (
          <Empty>V roce {year} zatím nic odehráno.</Empty>
        ) : (
          <div className="list">{played.map((s) => <Row key={s.id} slot={s} />)}</div>
        )}
      </section>

      {admin && (
        <section>
          <SectionTitle icon={Users}>Všichni hráči · {year}</SectionTitle>
          {players.length === 0 ? (
            <Empty>Žádná data.</Empty>
          ) : (
            <div className="list overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-3">
                  <tr>
                    <th className="p-3">Hráč</th>
                    <th className="p-3 text-right">Odehráno</th>
                    <th className="p-3 text-right">Zbývá</th>
                    <th className="p-3 text-right">Nadcház.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {players.map((p) => (
                    <tr key={p.id}>
                      <td className="p-3">
                        <Link href={link(year, p.id)} className="link">{p.name}</Link>
                      </td>
                      <td className="whitespace-nowrap p-3 text-right">{formatCzk(p.s.played)}</td>
                      <td className={`whitespace-nowrap p-3 text-right ${p.s.outstanding > 0 ? "font-bold text-warn" : ""}`}>
                        {formatCzk(p.s.outstanding)}
                      </td>
                      <td className="whitespace-nowrap p-3 text-right">{formatCzk(p.s.upcoming)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
