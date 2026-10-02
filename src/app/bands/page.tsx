import Link from "next/link";
import { AlertTriangle, ChevronRight, Music2, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { BAND_ROLE } from "@/lib/labels";
import { isAdmin, visibleBandIds } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Empty, PageHeader, bandGradient } from "@/components/ui";

export const metadata = { title: "Kapely" };

export default async function BandsPage() {
  const user = await requireUser();
  const ids = await visibleBandIds(user);
  const bands = await prisma.band.findMany({
    where: { id: { in: ids } },
    include: {
      memberships: { where: { userId: user.id } },
      _count: { select: { memberships: true, events: { where: { startAt: { gte: new Date() } } } } },
    },
    orderBy: { name: "asc" },
  });

  const counts = new Map<string, number>();
  for (const b of bands) counts.set(b.name.trim().toLowerCase(), (counts.get(b.name.trim().toLowerCase()) ?? 0) + 1);
  const twice = [...new Set(bands.filter((b) => (counts.get(b.name.trim().toLowerCase()) ?? 0) > 1).map((b) => b.name))];

  return (
    <div>
      <PageHeader
        title="Kapely"
        subtitle={isAdmin(user) ? "Vyber kapelu pro správu členů a akcí" : "Kapely, ve kterých hraješ"}
        actions={
          isAdmin(user) && (
            <Link href="/bands/new" className="btn-primary btn-sm">
              <Plus className="h-4 w-4" /> Nová kapela
            </Link>
          )
        }
      />
      {isAdmin(user) && twice.length > 0 && (
        <p className="mb-4 flex items-start gap-2 rounded-2xl bg-warn-soft p-3 text-sm text-warn">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Kapela {twice.map((n) => `„${n}“`).join(", ")} je založená vícekrát – akce se pak zobrazují dvakrát. Jednu z
            nich otevřete a dole ji smažte (Nastavení kapely → Smazat kapelu).
          </span>
        </p>
      )}
      {bands.length === 0 ? (
        <Empty icon={Music2}>Zatím žádné kapely.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {bands.map((band) => (
            <Link key={band.id} href={`/bands/${band.id}`} className="card flex items-center gap-4 p-3 transition hover:-translate-y-0.5 sm:p-3">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-display text-2xl font-black text-white"
                style={bandGradient(band.color)}
              >
                {band.name[0]?.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-bold">{band.name}</div>
                <div className="text-sm text-ink-2">
                  {band._count.memberships} členů · {band._count.events} akcí
                </div>
                {band.memberships[0] && <span className="badge mt-1 bg-brand-soft text-brand">{BAND_ROLE[band.memberships[0].role]}</span>}
              </div>
              <ChevronRight className="h-5 w-5 text-ink-3" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
