import Link from "next/link";
import { notFound } from "next/navigation";
import { addCar, deleteCar, joinCar, leaveCar } from "@/app/actions/cars";
import { addLineupSlot, assignLineupSlot, deleteEvent, removeLineupSlot, setAttendance, setSlotPay } from "@/app/actions/events";
import { formatCzk } from "@/lib/earnings";
import { requireUser } from "@/lib/auth";
import { eventFullInclude, findCarForUser } from "@/lib/event-details";
import { BAND_ROLE } from "@/lib/labels";
import { assertCanViewBand, canManageBand, isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { fmtDate, fmtTime, toLocalInput } from "@/lib/time";
import { NewPollForm } from "@/components/NewPollForm";
import { PollCard, pollInclude } from "@/components/PollCard";
import { SubmitButton } from "@/components/SubmitButton";
import { AttendanceBadge, BandDot, PageHeader, StatusBadge, personName } from "@/components/ui";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id }, include: eventFullInclude });
  if (!event) notFound();
  await assertCanViewBand(user, event.bandId);

  const polls = await prisma.poll.findMany({ where: { eventId: id }, include: pollInclude, orderBy: { createdAt: "desc" } });
  const manager = await canManageBand(user, event.bandId);
  const members = event.band.memberships;
  const myMembership = members.find((m) => m.userId === user.id);
  const answers = new Map(event.attendances.map((a) => [a.userId, a]));
  const myAnswer = answers.get(user.id);
  const myCar = findCarForUser(event, user.id);
  const iDrive = event.cars.some((c) => c.driverId === user.id);
  const admin = isAdmin(user);
  // Honorář: každý vidí jen svůj (pozice, které sám hraje), organizátor vidí vše.
  const mySlots = event.lineup.filter((s) => s.userId === user.id);
  const myPay = mySlots.some((s) => s.pay != null) ? mySlots.reduce((sum, s) => sum + (s.pay ?? 0), 0) : null;
  const myPaid = mySlots.length > 0 && mySlots.every((s) => s.paidAt);

  const going = members.filter((m) => {
    const s = answers.get(m.userId)?.status;
    return s === "YES" || (s !== "NO" && event.lineup.some((l) => l.userId === m.userId));
  });
  const withoutCar = going.filter((m) => !findCarForUser(event, m.userId));
  const mapsUrl = event.venueAddress
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.venueAddress)}`
    : null;

  const schedule = [
    { label: "Odjezd", time: event.departureAt, extra: event.meetingPoint },
    { label: "Příjezd / get-in", time: event.getInAt },
    { label: "Zvuková zkouška", time: event.soundcheckAt },
    { label: "Začátek", time: event.startAt },
    { label: "Konec", time: event.endAt },
  ].filter((s) => s.time);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/", label: "Koncerty" }}
        title={<span className={event.status === "CANCELLED" ? "line-through" : ""}>{event.title}</span>}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <BandDot color={event.band.color} />
            <Link href={`/bands/${event.bandId}`} className="font-medium text-slate-700">{event.band.name}</Link>
            <span>· {fmtDate(event.startAt)}</span>
            <StatusBadge status={event.status} />
          </span>
        }
        actions={manager && <Link href={`/events/${id}/edit`} className="btn-secondary btn-sm">✏️ Upravit</Link>}
      />

      {/* Moje odpověď */}
      {myMembership && event.status !== "CANCELLED" && (
        <section className="card border-brand-200 bg-brand-50/40">
          <h2 className="mb-2 font-bold">Můžeš hrát?</h2>
          <form action={setAttendance.bind(null, id)} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: "YES", l: "✅ Hraju", c: "bg-emerald-600 text-white" },
                { v: "MAYBE", l: "🤔 Možná", c: "bg-amber-500 text-white" },
                { v: "NO", l: "❌ Nemůžu", c: "bg-rose-600 text-white" },
              ].map((o) => (
                <SubmitButton
                  key={o.v}
                  name="status"
                  value={o.v}
                  className={`btn ${myAnswer?.status === o.v ? o.c : "border border-slate-300 bg-white text-slate-700"}`}
                >
                  {o.l}
                </SubmitButton>
              ))}
            </div>
            <input name="note" defaultValue={myAnswer?.note ?? ""} className="input" placeholder="Poznámka (volitelné) – např. přijedu později" />
          </form>
        </section>
      )}

      {mySlots.length > 0 && event.status !== "CANCELLED" && (
        <section className="card flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500">💰 Tvůj honorář za tuto akci 🔒</div>
            <div className="text-xl font-extrabold">{formatCzk(myPay)}</div>
          </div>
          <span className={`badge ${myPaid ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
            {myPaid ? "Vyplaceno" : "Nevyplaceno"}
          </span>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Harmonogram */}
        <section className="card">
          <h2 className="section-title">⏱ Harmonogram</h2>
          <ol className="space-y-2">
            {schedule.map((s) => (
              <li key={s.label} className="flex gap-3">
                <span className="w-14 shrink-0 font-mono text-lg font-bold text-brand-700">{fmtTime(s.time)}</span>
                <span>
                  {s.label}
                  {s.extra && <span className="block text-sm text-slate-500">{s.extra}</span>}
                </span>
              </li>
            ))}
          </ol>
          {myCar && (
            <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
              🚗 Jedeš v autě <b>{myCar.label || personName(myCar.driver)}</b>
              {myCar.departureAt && <> – odjezd <b>{fmtTime(myCar.departureAt)}</b></>}
              {myCar.departFrom && <> z {myCar.departFrom}</>}
            </p>
          )}
        </section>

        {/* Místo */}
        <section className="card">
          <h2 className="section-title">📍 Místo</h2>
          <div className="font-semibold">{event.venueName || "Neuvedeno"}</div>
          {event.venueAddress && <div className="text-sm text-slate-600">{event.venueAddress}</div>}
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn-secondary btn-sm mt-3">
              🧭 Navigovat
            </a>
          )}
          <dl className="mt-4 space-y-1 text-sm">
            {event.contactName && (
              <div><dt className="inline text-slate-500">Kontakt: </dt><dd className="inline">{event.contactName}</dd></div>
            )}
            {event.contactPhone && (
              <div>
                <dt className="inline text-slate-500">Telefon: </dt>
                <dd className="inline"><a className="text-brand-600" href={`tel:${event.contactPhone}`}>{event.contactPhone}</a></dd>
              </div>
            )}
            {admin && event.fee && (
              <div>
                <dt className="inline text-slate-500">Honorář za akci celkem 🔒: </dt>
                <dd className="inline">{event.fee}</dd>
              </div>
            )}
            {event.dressCode && <div><dt className="inline text-slate-500">Dress code: </dt><dd className="inline">{event.dressCode}</dd></div>}
          </dl>
        </section>
      </div>

      {(event.setlist || event.notes) && (
        <div className="grid gap-6 md:grid-cols-2">
          {event.setlist && (
            <section className="card">
              <h2 className="section-title">📝 Setlist</h2>
              <p className="whitespace-pre-line text-sm">{event.setlist}</p>
            </section>
          )}
          {event.notes && (
            <section className="card">
              <h2 className="section-title">🗒 Poznámky</h2>
              <p className="whitespace-pre-line text-sm">{event.notes}</p>
            </section>
          )}
        </div>
      )}

      {/* Sestava */}
      <section>
        <h2 className="section-title">🎶 Kdo hraje</h2>
        <div className="card divide-y divide-slate-100 p-0 sm:p-0">
          {event.lineup.length === 0 && <p className="p-4 text-sm text-slate-500">Sestava zatím není určena.</p>}
          {event.lineup.map((slot) => {
            const holderAnswer = slot.userId ? answers.get(slot.userId)?.status : undefined;
            const needsSub = !slot.userId || holderAnswer === "NO";
            const canTake = !!myMembership && needsSub && slot.userId !== user.id;
            return (
              <div key={slot.id} className={`p-4 ${needsSub ? "bg-rose-50/60" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{slot.instrument}</div>
                    <div className="font-semibold">
                      {slot.user ? personName(slot.user) : <span className="text-rose-700">Neobsazeno</span>}
                    </div>
                    {slot.userId && holderAnswer === "NO" && (
                      <div className="text-xs font-semibold text-rose-700">⚠️ Nemůže – hledá se záskok</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {slot.userId && <AttendanceBadge status={holderAnswer} />}
                    {canTake && !manager && (
                      <form action={assignLineupSlot.bind(null, slot.id)}>
                        <input type="hidden" name="userId" value={user.id} />
                        <SubmitButton className="btn-primary btn-sm">Zahraju já</SubmitButton>
                      </form>
                    )}
                    {!manager && slot.userId === user.id && (
                      <form action={assignLineupSlot.bind(null, slot.id)}>
                        <input type="hidden" name="userId" value="" />
                        <SubmitButton className="btn-secondary btn-sm" confirm="Uvolnit tuto pozici?">Uvolnit</SubmitButton>
                      </form>
                    )}
                  </div>
                </div>
                {admin && (
                  <form action={setSlotPay.bind(null, slot.id)} className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50/70 p-2">
                    <span className="text-xs font-semibold text-amber-800">💰 🔒</span>
                    <input
                      name="pay"
                      inputMode="numeric"
                      defaultValue={slot.pay ?? ""}
                      placeholder="Honorář Kč"
                      className="input min-h-[36px] w-28 flex-none py-1"
                    />
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" name="paid" defaultChecked={!!slot.paidAt} className="h-4 w-4 accent-brand-600" />
                      vyplaceno
                    </label>
                    <SubmitButton className="btn-secondary btn-sm">Uložit</SubmitButton>
                  </form>
                )}
                {manager && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <form action={assignLineupSlot.bind(null, slot.id)} className="flex flex-1 gap-2">
                      <select name="userId" defaultValue={slot.userId ?? ""} className="input min-w-0 flex-1">
                        <option value="">– neobsazeno –</option>
                        {members.map((m) => {
                          const a = answers.get(m.userId)?.status;
                          return (
                            <option key={m.userId} value={m.userId}>
                              {personName(m.user)} ({BAND_ROLE[m.role]}
                              {m.instrument ? `, ${m.instrument}` : ""}
                              {a === "NO" ? ", nemůže" : a === "YES" ? ", může" : ""})
                            </option>
                          );
                        })}
                      </select>
                      <SubmitButton className="btn-secondary btn-sm">Uložit</SubmitButton>
                    </form>
                    <form action={removeLineupSlot.bind(null, slot.id)}>
                      <SubmitButton className="btn-danger btn-sm" confirm="Odebrat pozici ze sestavy?">✕</SubmitButton>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {manager && (
          <form action={addLineupSlot.bind(null, id)} className="mt-2 flex gap-2">
            <input name="instrument" required placeholder="Nová pozice (např. saxofon)" className="input flex-1" />
            {admin && <input name="pay" inputMode="numeric" placeholder="Kč 🔒" className="input w-24 flex-none" />}
            <SubmitButton className="btn-secondary">Přidat</SubmitButton>
          </form>
        )}
      </section>

      {/* Odpovědi */}
      <section>
        <h2 className="section-title">🙋 Odpovědi členů</h2>
        <div className="card grid gap-2 sm:grid-cols-2">
          {members.map((m) => {
            const a = answers.get(m.userId);
            return (
              <div key={m.userId} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{personName(m.user)}</div>
                  <div className="truncate text-xs text-slate-500">
                    {BAND_ROLE[m.role]}
                    {m.instrument && ` · ${m.instrument}`}
                    {a?.note && ` · „${a.note}“`}
                  </div>
                </div>
                <AttendanceBadge status={a?.status} />
              </div>
            );
          })}
        </div>
      </section>

      {/* Doprava */}
      <section>
        <h2 className="section-title">🚗 Doprava</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {event.cars.map((car) => {
            const free = car.seats - car.seatsTaken.length;
            const mySeat = car.seatsTaken.find((s) => s.userId === user.id);
            const isDriver = car.driverId === user.id;
            return (
              <div key={car.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold">{car.label || "Auto"}</div>
                    <div className="text-sm text-slate-600">
                      Řidič: {personName(car.driver)}
                      {car.driver.phone && (
                        <> · <a className="text-brand-600" href={`tel:${car.driver.phone}`}>{car.driver.phone}</a></>
                      )}
                    </div>
                    {(car.departureAt || car.departFrom) && (
                      <div className="text-sm text-slate-600">
                        Odjezd {fmtTime(car.departureAt)} {car.departFrom && `· ${car.departFrom}`}
                      </div>
                    )}
                    {car.note && <div className="text-xs text-slate-500">{car.note}</div>}
                  </div>
                  <span className={`badge ${free > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                    {free > 0 ? `${free} volná místa` : "plno"}
                  </span>
                </div>
                <ul className="mt-3 space-y-1">
                  {car.seatsTaken.map((seat) => (
                    <li key={seat.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                      {personName(seat.user)}
                      {(manager || isDriver || seat.userId === user.id) && (
                        <form action={leaveCar.bind(null, seat.id)}>
                          <SubmitButton className="text-xs font-semibold text-rose-600">
                            {seat.userId === user.id ? "Vystoupit" : "Odebrat"}
                          </SubmitButton>
                        </form>
                      )}
                    </li>
                  ))}
                  {Array.from({ length: Math.max(0, free) }).map((_, i) => (
                    <li key={i} className="rounded-lg border border-dashed border-slate-200 px-3 py-1.5 text-sm text-slate-400">volné místo</li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  {myMembership && !isDriver && !mySeat && free > 0 && !iDrive && (
                    <form action={joinCar.bind(null, car.id)}>
                      <SubmitButton className="btn-primary btn-sm">{myCar ? "Přesednout sem" : "Pojedu tímto autem"}</SubmitButton>
                    </form>
                  )}
                  {manager && free > 0 && withoutCar.some((m) => m.userId !== car.driverId) && (
                    <form action={joinCar.bind(null, car.id)} className="flex gap-2">
                      <select name="userId" className="input btn-sm min-h-[36px] py-0">
                        {withoutCar
                          .filter((m) => m.userId !== car.driverId)
                          .map((m) => (
                            <option key={m.userId} value={m.userId}>{personName(m.user)}</option>
                          ))}
                      </select>
                      <SubmitButton className="btn-secondary btn-sm">Posadit</SubmitButton>
                    </form>
                  )}
                  {(manager || isDriver) && (
                    <form action={deleteCar.bind(null, car.id)}>
                      <SubmitButton className="btn-danger btn-sm" confirm="Odebrat auto?">Odebrat auto</SubmitButton>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {withoutCar.length > 0 && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            Bez auta: {withoutCar.map((m) => personName(m.user)).join(", ")}
          </p>
        )}

        {(myMembership || manager) && (!iDrive || manager) && (
          <details className="card mt-3">
            <summary className="cursor-pointer font-semibold text-brand-700">+ Nabídnout auto</summary>
            <form action={addCar.bind(null, id)} className="mt-3 grid gap-3 sm:grid-cols-2">
              {manager && (
                <div className="sm:col-span-2">
                  <label className="label">Řidič</label>
                  <select name="driverId" defaultValue={user.id} className="input">
                    {members
                      .filter((m) => !event.cars.some((c) => c.driverId === m.userId))
                      .map((m) => (
                        <option key={m.userId} value={m.userId}>{personName(m.user)}</option>
                      ))}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Auto</label>
                <input name="label" className="input" placeholder="např. Octavia combi" />
              </div>
              <div>
                <label className="label">Volná místa pro spolujezdce</label>
                <input name="seats" type="number" min={1} max={8} defaultValue={3} className="input" />
              </div>
              <div>
                <label className="label">Odjezd</label>
                <input name="departureAt" type="datetime-local" defaultValue={toLocalInput(event.departureAt)} className="input" />
              </div>
              <div>
                <label className="label">Odkud</label>
                <input name="departFrom" defaultValue={event.meetingPoint ?? ""} className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Poznámka</label>
                <input name="note" className="input" placeholder="např. vezu bicí, místo na aparát" />
              </div>
              <div className="sm:col-span-2">
                <SubmitButton>Přidat auto</SubmitButton>
              </div>
            </form>
          </details>
        )}
      </section>

      {/* Ankety */}
      <section>
        <h2 className="section-title">🗳 Hlasování k akci</h2>
        <div className="space-y-3">
          {(myMembership || manager) && <NewPollForm bandId={event.bandId} eventId={id} />}
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} userId={user.id} canManage={manager} canVote={!!myMembership} />
          ))}
        </div>
      </section>

      {manager && (
        <form action={deleteEvent.bind(null, id)} className="border-t border-slate-200 pt-6">
          <SubmitButton className="btn-danger" confirm="Opravdu smazat akci? Zmizí i z kalendářů členů.">
            Smazat akci
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
