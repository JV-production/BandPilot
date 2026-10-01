import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { isAdmin, visibleBandIds } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { BAND_ROLE } from "@/lib/labels";
import { BandDot, Empty, PageHeader } from "@/components/ui";

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

  return (
    <div>
      <PageHeader
        title="Kapely"
        actions={isAdmin(user) && <Link href="/bands/new" className="btn-primary btn-sm">+ Nová kapela</Link>}
      />
      {bands.length === 0 ? (
        <Empty>Zatím žádné kapely.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {bands.map((band) => (
            <Link key={band.id} href={`/bands/${band.id}`} className="card flex items-center gap-3 hover:border-brand-300">
              <BandDot color={band.color} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{band.name}</div>
                <div className="text-xs text-slate-500">
                  {band._count.memberships} členů · {band._count.events} nadcházejících akcí
                  {band.memberships[0] && ` · ${BAND_ROLE[band.memberships[0].role]}`}
                </div>
              </div>
              <span className="text-slate-400">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
