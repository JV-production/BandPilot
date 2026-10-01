import Link from "next/link";
import { notFound } from "next/navigation";
import { addMember, deleteBand, removeMember, updateBand, updateMember } from "@/app/actions/bands";
import { requireUser } from "@/lib/auth";
import { BAND_ROLE } from "@/lib/labels";
import { assertCanViewBand, canManageBand, getMembership, isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { EventCard } from "@/components/EventCard";
import { NewPollForm } from "@/components/NewPollForm";
import { PollCard, pollInclude } from "@/components/PollCard";
import { SubmitButton } from "@/components/SubmitButton";
import { BandDot, Empty, PageHeader, personName } from "@/components/ui";

const ROLE_ORDER: Record<string, number> = { LEADER: 0, MEMBER: 1, SUBSTITUTE: 2 };

function RoleSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <select name="role" defaultValue={defaultValue ?? "MEMBER"} className="input">
      <option value="LEADER">Vedoucí</option>
      <option value="MEMBER">Člen</option>
      <option value="SUBSTITUTE">Alternace / záskok</option>
    </select>
  );
}

export default async function BandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  await assertCanViewBand(user, id);

  const band = await prisma.band.findUnique({
    where: { id },
    include: {
      memberships: { include: { user: true } },
      events: { where: { startAt: { gte: new Date(Date.now() - 12 * 3600 * 1000) } }, orderBy: { startAt: "asc" } },
      polls: { where: { eventId: null }, include: pollInclude, orderBy: { createdAt: "desc" } },
    },
  });
  if (!band) notFound();

  const admin = isAdmin(user);
  const manager = await canManageBand(user, id);
  const member = !!(await getMembership(user, id));
  const members = [...band.memberships].sort(
    (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || personName(a.user).localeCompare(personName(b.user), "cs"),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <BandDot color={band.color} /> {band.name}
          </span>
        }
        subtitle={band.description}
        back={{ href: "/bands", label: "Kapely" }}
        actions={manager && <Link href={`/bands/${id}/events/new`} className="btn-primary btn-sm">+ Nová akce</Link>}
      />

      <section>
        <h2 className="section-title">Nadcházející akce</h2>
        {band.events.length === 0 ? (
          <Empty>Žádné naplánované akce.</Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {band.events.map((e) => (
              <EventCard key={e.id} event={{ ...e, band }} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title">Členové ({members.length})</h2>
        <div className="card divide-y divide-slate-100 p-0 sm:p-0">
          {members.length === 0 && <p className="p-4 text-sm text-slate-500">Kapela zatím nemá žádné členy.</p>}
          {members.map((m) => (
            <div key={m.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold">{personName(m.user)}</div>
                  <div className="text-xs text-slate-500">
                    {BAND_ROLE[m.role]}
                    {m.instrument && ` · ${m.instrument}`}
                    {m.user.phone && (
                      <>
                        {" · "}
                        <a href={`tel:${m.user.phone}`} className="text-brand-600">{m.user.phone}</a>
                      </>
                    )}
                    {admin && ` · ${m.user.email}`}
                  </div>
                </div>
              </div>
              {admin && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-brand-600">Upravit</summary>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <form action={updateMember.bind(null, m.id)} className="flex flex-1 flex-wrap items-end gap-2">
                      <div className="min-w-[140px] flex-1">
                        <label className="label">Role</label>
                        <RoleSelect defaultValue={m.role} />
                      </div>
                      <div className="min-w-[140px] flex-1">
                        <label className="label">Nástroj</label>
                        <input name="instrument" defaultValue={m.instrument ?? ""} className="input" />
                      </div>
                      <SubmitButton className="btn-secondary">Uložit</SubmitButton>
                    </form>
                    <form action={removeMember.bind(null, m.id)}>
                      <SubmitButton className="btn-danger" confirm={`Odebrat ${personName(m.user)} z kapely?`}>
                        Odebrat
                      </SubmitButton>
                    </form>
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>

        {admin && (
          <form action={addMember.bind(null, id)} className="card mt-3 grid gap-3 sm:grid-cols-2">
            <h3 className="font-bold sm:col-span-2">Přidat člena / přidělit přístup</h3>
            <div>
              <label className="label">E-mail (Google účet) *</label>
              <input name="email" type="email" required className="input" placeholder="clen@gmail.com" />
            </div>
            <div>
              <label className="label">Jméno</label>
              <input name="name" className="input" />
            </div>
            <div>
              <label className="label">Role</label>
              <RoleSelect />
            </div>
            <div>
              <label className="label">Nástroj / pozice</label>
              <input name="instrument" className="input" placeholder="bicí, kytara, zpěv…" />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton>Přidat do kapely</SubmitButton>
            </div>
          </form>
        )}
      </section>

      <section>
        <h2 className="section-title">Ankety kapely</h2>
        <div className="space-y-3">
          {(member || admin) && <NewPollForm bandId={id} eventId={null} />}
          {band.polls.length === 0 && <Empty>Žádné ankety.</Empty>}
          {band.polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} userId={user.id} canManage={manager} canVote={member} />
          ))}
        </div>
      </section>

      {admin && (
        <section>
          <h2 className="section-title">Nastavení kapely</h2>
          <form action={updateBand.bind(null, id)} className="card space-y-3">
            <div>
              <label className="label">Název</label>
              <input name="name" required defaultValue={band.name} className="input" />
            </div>
            <div>
              <label className="label">Popis</label>
              <textarea name="description" rows={2} defaultValue={band.description ?? ""} className="input" />
            </div>
            <div>
              <label className="label">Barva</label>
              <input name="color" type="color" defaultValue={band.color} className="h-11 w-20 rounded-lg border border-slate-300" />
            </div>
            <SubmitButton className="btn-secondary">Uložit</SubmitButton>
          </form>
          <form action={deleteBand.bind(null, id)} className="mt-3">
            <SubmitButton className="btn-danger" confirm="Smazat kapelu včetně všech akcí? Tuto akci nelze vrátit.">
              Smazat kapelu
            </SubmitButton>
          </form>
        </section>
      )}
    </div>
  );
}
