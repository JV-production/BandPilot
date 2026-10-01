import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatCzk, summarizePay, type PaySummary } from "@/lib/earnings";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { fmt, fmtShortDate, TIMEZONE } from "@/lib/time";
import { formatInTimeZone } from "date-fns-tz";
import { BandDot, Empty, PageHeader, StatusBadge, personName } from "@/components/ui";

export const metadata = { title: "Honoráře" };

function yearRange(year: number) {
  // Hranice roku v časovém pásmu kapely (přibližně – stačí pro filtr).
  return { gte: new Date(`${year}-01-01T00:00:00Z`), lt: new Date(`${year + 1}-01-01T00:00:00Z`) };
}

function SummaryTiles({ s }: { s: PaySummary }) {
  const tiles = [
    { label: "Odehráno", value: s.played, sub: `${s.playedCount} akcí` },
    { label: "Vyplaceno", value: s.paid },
    { label: "Zbývá doplatit", value: s.outstanding, highlight: s.outstanding > 0 },
    { label: "Nadcházející", value: s.upcoming, sub: `${s.upcomingCount} akcí` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className={`card ${t.highlight ? "border-amber-300 bg-amber-50" : ""}`}>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.label}</div>
          <div className="mt-1 text-xl font-extrabold">{formatCzk(t.value)}</div>
          {t.sub && <div className="text-xs text-slate-500">{t.sub}</div>}
        </div>
      ))}
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
    <Link href={`/events/${slot.event.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <BandDot color={slot.event.band.color} /> {slot.event.band.name} · {fmtShortDate(slot.event.startAt)}
        </div>
        <div className={`truncate font-semibold ${slot.event.status === "CANCELLED" ? "line-through text-slate-400" : ""}`}>
          {slot.event.title}
        </div>
        <div className="text-xs text-slate-500">{slot.instrument}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-bold">{slot.event.status === "CANCELLED" ? "—" : formatCzk(slot.pay)}</div>
        {slot.event.status === "CANCELLED" ? (
          <StatusBadge status="CANCELLED" />
        ) : slot.event.startAt < now ? (
          <span className={`badge ${slot.paidAt ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
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
        subtitle="🔒 Tyto částky vidíš jen ty a organizátor."
        back={target.id !== me.id ? { href: link(year), label: "Moje honoráře" } : undefined}
        actions={
          <div className="flex items-center gap-1">
            <Link href={link(year - 1, target.id)} className="btn-secondary btn-sm" aria-label="Předchozí rok">‹</Link>
            <span className="px-2 font-bold">{year}</span>
            <Link href={link(year + 1, target.id)} className="btn-secondary btn-sm" aria-label="Další rok">›</Link>
          </div>
        }
      />

      <SummaryTiles s={summary} />
      {summary.unsetCount > 0 && (
        <p className="text-xs text-slate-500">U {summary.unsetCount} akcí zatím není honorář určen (počítá se jako 0 Kč).</p>
      )}

      <section>
        <h2 className="section-title">Nadcházející</h2>
        {upcoming.length === 0 ? (
          <Empty>Žádné nadcházející akce v sestavě.</Empty>
        ) : (
          <div className="card divide-y divide-slate-100 p-0 sm:p-0">{upcoming.map((s) => <Row key={s.id} slot={s} />)}</div>
        )}
      </section>

      <section>
        <h2 className="section-title">Odehráno</h2>
        {played.length === 0 ? (
          <Empty>V roce {year} zatím nic odehráno.</Empty>
        ) : (
          <div className="card divide-y divide-slate-100 p-0 sm:p-0">{played.map((s) => <Row key={s.id} slot={s} />)}</div>
        )}
      </section>

      {admin && (
        <section>
          <h2 className="section-title">Přehled všech hráčů ({year}) 🔒</h2>
          {players.length === 0 ? (
            <Empty>Žádná data.</Empty>
          ) : (
            <div className="card overflow-x-auto p-0 sm:p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Hráč</th>
                    <th className="p-3 text-right">Odehráno</th>
                    <th className="p-3 text-right">Zbývá</th>
                    <th className="p-3 text-right">Nadcház.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {players.map((p) => (
                    <tr key={p.id}>
                      <td className="p-3">
                        <Link href={link(year, p.id)} className="font-semibold text-brand-700">{p.name}</Link>
                      </td>
                      <td className="whitespace-nowrap p-3 text-right">{formatCzk(p.s.played)}</td>
                      <td className={`whitespace-nowrap p-3 text-right ${p.s.outstanding > 0 ? "font-bold text-amber-700" : ""}`}>
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
