import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CalendarX2, ChevronDown, Plus, Settings2, Trash2, UserPlus, Users, Vote } from "lucide-react";
import { addMember, deleteBand, removeMember, updateBand, updateMember } from "@/app/actions/bands";
import { requireUser } from "@/lib/auth";
import { formatCzk } from "@/lib/earnings";
import { BAND_ROLE } from "@/lib/labels";
import { assertCanViewBand, canManageBand, getMembership, isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { EventCard } from "@/components/EventCard";
import { NewPollForm } from "@/components/NewPollForm";
import { PollCard, pollInclude } from "@/components/PollCard";
import { SubmitButton } from "@/components/SubmitButton";
import { Avatar, Empty, SectionTitle, bandGradient, personName } from "@/components/ui";

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
      <section
        className="relative -mx-4 -mt-6 overflow-hidden px-5 pb-6 pt-5 text-white sm:mx-0 sm:mt-0 sm:rounded-3xl"
        style={bandGradient(band.color)}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative">
          <Link href="/bands" className="text-sm font-medium text-white/80">
            ‹ Kapely
          </Link>
          <h1 className="mt-3 font-display text-[2.2rem] font-black leading-tight tracking-tight">{band.name}</h1>
          {band.description && <p className="mt-1 text-white/85">{band.description}</p>}
          <div className="mt-3 flex gap-2 text-xs font-semibold">
            <span className="rounded-full bg-black/20 px-3 py-1">{members.length} členů</span>
            <span className="rounded-full bg-black/20 px-3 py-1">{band.events.length} nadcházejících akcí</span>
          </div>
          {manager && (
            <Link href={`/bands/${id}/events/new`} className="btn btn-sm mt-5 bg-white text-[#111] hover:bg-white/90">
              <Plus className="h-4 w-4" /> Nová akce
            </Link>
          )}
        </div>
      </section>

      <section>
        <SectionTitle icon={CalendarDays}>Nadcházející akce</SectionTitle>
        {band.events.length === 0 ? (
          <Empty icon={CalendarX2}>Žádné naplánované akce.</Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {band.events.map((e) => (
              <EventCard key={e.id} event={{ ...e, band }} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle icon={Users}>Členové</SectionTitle>
        <div className="list">
          {members.length === 0 && <p className="p-4 text-sm text-ink-3">Kapela zatím nemá žádné členy.</p>}
          {members.map((m) => (
            <div key={m.id}>
              <div className="list-row">
                <Avatar user={m.user} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{personName(m.user)}</div>
                  <div className="truncate text-xs text-ink-3">
                    {m.instrument || "bez nástroje"}
                    {m.user.phone && (
                      <>
                        {" · "}
                        <a href={`tel:${m.user.phone}`} className="link">
                          {m.user.phone}
                        </a>
                      </>
                    )}
                    {admin && ` · ${m.user.email}`}
                  </div>
                  {(admin || m.userId === user.id) && m.defaultPay != null && (
                    <div className="text-xs text-ink-3">💰 {formatCzk(m.defaultPay)} / akce · neveřejné</div>
                  )}
                </div>
                <span
                  className={`badge ${
                    m.role === "LEADER" ? "bg-brand-soft text-brand" : m.role === "SUBSTITUTE" ? "bg-surface-2 text-ink-2" : "bg-ok-soft text-ok"
                  }`}
                >
                  {BAND_ROLE[m.role]}
                </span>
              </div>
              {admin && (
                <details className="group px-4 pb-3">
                  <summary className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-brand">
                    Upravit <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 space-y-2">
                    <form action={updateMember.bind(null, m.id)} className="grid gap-2 sm:grid-cols-4 sm:items-end">
                      <div>
                        <label className="label">Role</label>
                        <RoleSelect defaultValue={m.role} />
                      </div>
                      <div>
                        <label className="label">Nástroj</label>
                        <input name="instrument" defaultValue={m.instrument ?? ""} className="input" />
                      </div>
                      <div>
                        <label className="label">Honorář / akce</label>
                        <input name="defaultPay" inputMode="numeric" defaultValue={m.defaultPay ?? ""} className="input" />
                      </div>
                      <SubmitButton className="btn-secondary">Uložit</SubmitButton>
                    </form>
                    <form action={removeMember.bind(null, m.id)}>
                      <SubmitButton className="btn-danger btn-sm" confirm={`Odebrat ${personName(m.user)} z kapely?`}>
                        <Trash2 className="h-3.5 w-3.5" /> Odebrat z kapely
                      </SubmitButton>
                    </form>
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>

        {admin && (
          <details className="card group mt-3 p-0 sm:p-0">
            <summary className="flex cursor-pointer items-center gap-2 p-4 font-semibold text-brand">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft">
                <UserPlus className="h-4 w-4" />
              </span>
              Přidat člena
            </summary>
            <form action={addMember.bind(null, id)} className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
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
                <label className="label">Výchozí honorář za akci (Kč)</label>
                <input name="defaultPay" inputMode="numeric" className="input" placeholder="např. 2500" />
                <p className="mt-1.5 text-xs text-ink-3">Vidí jen organizátor a tento člen.</p>
              </div>
              <div className="sm:col-span-2">
                <SubmitButton className="btn-primary w-full sm:w-auto">Přidat do kapely</SubmitButton>
              </div>
            </form>
          </details>
        )}
      </section>

      <section>
        <SectionTitle icon={Vote}>Ankety kapely</SectionTitle>
        <div className="space-y-3">
          {band.polls.length === 0 && !(member || admin) && <Empty>Žádné ankety.</Empty>}
          {band.polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} userId={user.id} canManage={manager} canVote={member} />
          ))}
          {(member || admin) && <NewPollForm bandId={id} eventId={null} />}
        </div>
      </section>

      {admin && (
        <section>
          <SectionTitle icon={Settings2}>Nastavení kapely</SectionTitle>
          <form action={updateBand.bind(null, id)} className="card space-y-4">
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
              <input name="color" type="color" defaultValue={band.color} className="h-12 w-20 cursor-pointer rounded-xl border border-line bg-surface p-1" />
            </div>
            <SubmitButton className="btn-secondary">Uložit</SubmitButton>
          </form>
          <form action={deleteBand.bind(null, id)} className="mt-3">
            <SubmitButton className="btn-danger" confirm="Smazat kapelu včetně všech akcí? Tuto akci nelze vrátit.">
              <Trash2 className="h-4 w-4" /> Smazat kapelu
            </SubmitButton>
          </form>
        </section>
      )}
    </div>
  );
}
