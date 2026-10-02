import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  Car,
  ChevronDown,
  CircleCheck,
  CircleHelp,
  CircleX,
  ClipboardList,
  FileText,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Plus,
  Shirt,
  StickyNote,
  Trash2,
  User,
  Users,
  Vote,
} from "lucide-react";
import { addCar, deleteCar, joinCar, leaveCar } from "@/app/actions/cars";
import { addLineupSlot, assignLineupSlot, deleteEvent, removeLineupSlot, setAttendance, setSlotPay } from "@/app/actions/events";
import { requireUser } from "@/lib/auth";
import { formatCzk } from "@/lib/earnings";
import { eventFullInclude, findCarForUser } from "@/lib/event-details";
import { BAND_ROLE } from "@/lib/labels";
import { assertCanViewBand, canManageBand, isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { fmtDate, fmtTime, toLocalInput } from "@/lib/time";
import { NewPollForm } from "@/components/NewPollForm";
import { PollCard, pollInclude } from "@/components/PollCard";
import { SubmitButton } from "@/components/SubmitButton";
import { AttendanceBadge, Avatar, SectionTitle, StatusBadge, bandGradient, personName } from "@/components/ui";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id }, include: eventFullInclude });
  if (!event) notFound();
  await assertCanViewBand(user, event.bandId);

  const polls = await prisma.poll.findMany({ where: { eventId: id }, include: pollInclude, orderBy: { createdAt: "desc" } });
  const manager = await canManageBand(user, event.bandId);
  const admin = isAdmin(user);
  const members = event.band.memberships;
  const myMembership = members.find((m) => m.userId === user.id);
  const answers = new Map(event.attendances.map((a) => [a.userId, a]));
  const myAnswer = answers.get(user.id);
  const myCar = findCarForUser(event, user.id);
  const iDrive = event.cars.some((c) => c.driverId === user.id);
  const cancelled = event.status === "CANCELLED";

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

  const counts = { YES: 0, MAYBE: 0, NO: 0, NONE: 0 };
  for (const m of members) counts[(answers.get(m.userId)?.status as "YES" | "MAYBE" | "NO") ?? "NONE"]++;

  const schedule = [
    { label: "Odjezd", time: event.departureAt, extra: event.meetingPoint },
    { label: "Příjezd / get-in", time: event.getInAt },
    { label: "Zvuková zkouška", time: event.soundcheckAt },
    { label: "Začátek vystoupení", time: event.startAt, main: true },
    { label: "Konec", time: event.endAt },
  ].filter((s) => s.time);

  const ANSWERS = [
    { v: "YES", l: "Hraju", Icon: CircleCheck, on: "bg-ok text-white shadow-lg shadow-ok/30" },
    { v: "MAYBE", l: "Možná", Icon: CircleHelp, on: "bg-warn text-white shadow-lg shadow-warn/30" },
    { v: "NO", l: "Nemůžu", Icon: CircleX, on: "bg-bad text-white shadow-lg shadow-bad/30" },
  ];

  return (
    <div className="space-y-7">
      {/* Hlavička v barvě kapely */}
      <section
        className={`relative -mx-4 -mt-6 overflow-hidden px-5 pb-6 pt-5 text-white sm:mx-0 sm:mt-0 sm:rounded-3xl ${cancelled ? "grayscale" : ""}`}
        style={bandGradient(event.band.color)}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative">
          <div className="flex items-center justify-between gap-2">
            <Link href={`/bands/${event.bandId}`} className="rounded-full bg-black/20 px-3 py-1 text-xs font-semibold backdrop-blur">
              {event.band.name}
            </Link>
            <StatusBadge status={event.status} />
          </div>
          <h1 className={`mt-4 font-display text-[2rem] font-black leading-tight tracking-tight ${cancelled ? "line-through" : ""}`}>
            {event.title}
          </h1>
          <p className="mt-1 text-[15px] font-medium capitalize text-white/85">
            {fmtDate(event.startAt)} · {fmtTime(event.startAt)}
          </p>
          {(event.venueName || event.venueAddress) && (
            <p className="mt-2 flex items-start gap-1.5 text-sm text-white/85">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{[event.venueName, event.venueAddress].filter(Boolean).join(", ")}</span>
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn btn-sm bg-white text-[#111] hover:bg-white/90">
                <Navigation className="h-4 w-4" /> Navigovat
              </a>
            )}
            {event.contactPhone && (
              <a href={`tel:${event.contactPhone}`} className="btn btn-sm bg-white/15 text-white backdrop-blur hover:bg-white/25">
                <Phone className="h-4 w-4" /> Kontakt
              </a>
            )}
            {manager && (
              <Link href={`/events/${id}/edit`} className="btn btn-sm bg-white/15 text-white backdrop-blur hover:bg-white/25">
                <Pencil className="h-4 w-4" /> Upravit
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Moje odpověď */}
      {myMembership && !cancelled && (
        <section className="card">
          <h2 className="mb-3 text-[17px] font-bold">Můžeš hrát?</h2>
          <form action={setAttendance.bind(null, id)} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {ANSWERS.map(({ v, l, Icon, on }) => (
                <SubmitButton
                  key={v}
                  name="status"
                  value={v}
                  className={`btn flex-col gap-1 py-3 ${myAnswer?.status === v ? on : "bg-surface-2 text-ink-2 hover:bg-line"}`}
                >
                  <Icon className="h-5 w-5" />
                  {l}
                </SubmitButton>
              ))}
            </div>
            <input name="note" defaultValue={myAnswer?.note ?? ""} className="input" placeholder="Poznámka (např. přijedu později)" />
          </form>
        </section>
      )}

      {mySlots.length > 0 && !cancelled && (
        <section className="card flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Banknote className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-ink-3">Tvůj honorář · vidíš jen ty</div>
            <div className="font-display text-2xl font-black">{formatCzk(myPay)}</div>
          </div>
          <span className={`badge ${myPaid ? "bg-ok-soft text-ok" : "bg-surface-2 text-ink-2"}`}>{myPaid ? "Vyplaceno" : "Nevyplaceno"}</span>
        </section>
      )}

      <div className="grid gap-7 md:grid-cols-2">
        {/* Harmonogram – časová osa */}
        <section>
          <SectionTitle icon={ClipboardList}>Harmonogram</SectionTitle>
          <div className="card">
            <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-0.5 before:bg-line">
              {schedule.map((s) => (
                <li key={s.label} className="relative flex items-baseline gap-4 pl-6">
                  <span
                    className={`absolute left-0 top-1.5 h-3 w-3 rounded-full ring-4 ring-surface ${s.main ? "bg-brand" : "bg-ink-3"}`}
                  />
                  <span className={`w-14 shrink-0 font-display text-lg font-black tabular-nums ${s.main ? "text-brand" : ""}`}>
                    {fmtTime(s.time)}
                  </span>
                  <span className="min-w-0">
                    <span className={s.main ? "font-bold" : "font-medium"}>{s.label}</span>
                    {s.extra && <span className="block text-sm text-ink-3">{s.extra}</span>}
                  </span>
                </li>
              ))}
            </ol>
            {myCar && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-2 p-3 text-sm">
                <Car className="h-5 w-5 shrink-0 text-brand" />
                <span>
                  Jedeš v autě <b>{myCar.label || personName(myCar.driver)}</b>
                  {myCar.departureAt && (
                    <>
                      {" "}
                      · odjezd <b>{fmtTime(myCar.departureAt)}</b>
                    </>
                  )}
                  {myCar.departFrom && <> z {myCar.departFrom}</>}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Info */}
        <section>
          <SectionTitle icon={FileText}>Informace</SectionTitle>
          <div className="list">
            {[
              { icon: MapPin, label: "Místo", value: [event.venueName, event.venueAddress].filter(Boolean).join(", ") || "Neuvedeno" },
              { icon: User, label: "Kontakt", value: event.contactName },
              {
                icon: Phone,
                label: "Telefon",
                value: event.contactPhone && (
                  <a className="link" href={`tel:${event.contactPhone}`}>
                    {event.contactPhone}
                  </a>
                ),
              },
              { icon: Shirt, label: "Dress code", value: event.dressCode },
              { icon: Banknote, label: "Honorář celkem · jen organizátor", value: admin ? event.fee : null },
            ]
              .filter((r) => r.value)
              .map(({ icon: Icon, label, value }) => (
                <div key={label} className="list-row">
                  <Icon className="h-5 w-5 shrink-0 text-ink-3" />
                  <div className="min-w-0">
                    <div className="text-xs text-ink-3">{label}</div>
                    <div className="font-medium">{value}</div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>

      {(event.setlist || event.notes) && (
        <div className="grid gap-7 md:grid-cols-2">
          {event.setlist && (
            <section>
              <SectionTitle icon={FileText}>Setlist</SectionTitle>
              <div className="card whitespace-pre-line text-[15px] leading-relaxed">{event.setlist}</div>
            </section>
          )}
          {event.notes && (
            <section>
              <SectionTitle icon={StickyNote}>Poznámky</SectionTitle>
              <div className="card whitespace-pre-line text-[15px] leading-relaxed">{event.notes}</div>
            </section>
          )}
        </div>
      )}

      {/* Sestava */}
      <section>
        <SectionTitle icon={Users}>Kdo hraje</SectionTitle>
        <div className="list">
          {event.lineup.length === 0 && <p className="p-4 text-sm text-ink-3">Sestava zatím není určena.</p>}
          {event.lineup.map((slot) => {
            const holderAnswer = slot.userId ? answers.get(slot.userId)?.status : undefined;
            const needsSub = !slot.userId || holderAnswer === "NO";
            const canTake = !!myMembership && needsSub && slot.userId !== user.id;
            return (
              <div key={slot.id} className={needsSub ? "bg-bad-soft/40" : ""}>
                <div className="list-row">
                  {slot.user ? (
                    <Avatar user={slot.user} />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-bad/50 text-bad">
                      ?
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">{slot.instrument}</div>
                    <div className="truncate font-semibold">{slot.user ? personName(slot.user) : <span className="text-bad">Neobsazeno</span>}</div>
                    {slot.userId && holderAnswer === "NO" && (
                      <div className="flex items-center gap-1 text-xs font-semibold text-bad">
                        <AlertTriangle className="h-3.5 w-3.5" /> Nemůže – hledá se záskok
                      </div>
                    )}
                  </div>
                  {slot.userId && holderAnswer !== "NO" && <AttendanceBadge status={holderAnswer} />}
                </div>
                {((canTake && !manager) || (!manager && slot.userId === user.id)) && (
                  <div className="-mt-1 flex justify-end px-4 pb-3">
                    {canTake && !manager && (
                      <form action={assignLineupSlot.bind(null, slot.id)}>
                        <input type="hidden" name="userId" value={user.id} />
                        <SubmitButton className="btn-primary btn-sm">Zahraju já</SubmitButton>
                      </form>
                    )}
                    {!manager && slot.userId === user.id && (
                      <form action={assignLineupSlot.bind(null, slot.id)}>
                        <input type="hidden" name="userId" value="" />
                        <SubmitButton className="btn-secondary btn-sm" confirm="Uvolnit tuto pozici?">
                          Uvolnit pozici
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                )}
                {(manager || admin) && (
                  <details className="group px-4 pb-3">
                    <summary className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-brand">
                      Upravit pozici
                      {admin && slot.pay != null && <span className="text-ink-3">· {formatCzk(slot.pay)}{slot.paidAt ? " ✓" : ""}</span>}
                      <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                    </summary>
                    <div className="mt-2 space-y-2">
                      {manager && (
                        <div className="flex gap-2">
                          <form action={assignLineupSlot.bind(null, slot.id)} className="flex min-w-0 flex-1 gap-2">
                            <select name="userId" defaultValue={slot.userId ?? ""} className="input min-h-[40px] min-w-0 flex-1 py-1.5">
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
                            <SubmitButton className="btn-danger btn-sm" confirm="Odebrat pozici ze sestavy?">
                              <Trash2 className="h-3.5 w-3.5" />
                            </SubmitButton>
                          </form>
                        </div>
                      )}
                      {admin && (
                        <form action={setSlotPay.bind(null, slot.id)} className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface-2 p-2">
                          <Banknote className="ml-1 h-4 w-4 text-ink-3" />
                          <input
                            name="pay"
                            inputMode="numeric"
                            defaultValue={slot.pay ?? ""}
                            placeholder="Honorář Kč"
                            className="input min-h-[36px] w-28 flex-none bg-surface py-1"
                          />
                          <label className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
                            <input type="checkbox" name="paid" defaultChecked={!!slot.paidAt} className="h-4 w-4 accent-[rgb(var(--brand))]" />
                            vyplaceno
                          </label>
                          <SubmitButton className="btn-secondary btn-sm ml-auto">Uložit</SubmitButton>
                        </form>
                      )}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
        {manager && (
          <form action={addLineupSlot.bind(null, id)} className="mt-3 flex gap-2">
            <input name="instrument" required placeholder="Nová pozice, např. saxofon" className="input min-w-0 flex-1" />
            {admin && <input name="pay" inputMode="numeric" placeholder="Kč" className="input w-24 flex-none" />}
            <SubmitButton className="btn-secondary">
              <Plus className="h-4 w-4" />
            </SubmitButton>
          </form>
        )}
      </section>

      {/* Odpovědi */}
      <section>
        <SectionTitle icon={CircleCheck}>Odpovědi</SectionTitle>
        <div className="mb-3 grid grid-cols-4 gap-2 text-center">
          {[
            { n: counts.YES, l: "hraje", c: "text-ok" },
            { n: counts.MAYBE, l: "možná", c: "text-warn" },
            { n: counts.NO, l: "nemůže", c: "text-bad" },
            { n: counts.NONE, l: "bez odpovědi", c: "text-ink-3" },
          ].map((x) => (
            <div key={x.l} className="rounded-2xl bg-surface p-2.5 shadow-card">
              <div className={`font-display text-2xl font-black ${x.c}`}>{x.n}</div>
              <div className="truncate text-[11px] text-ink-3">{x.l}</div>
            </div>
          ))}
        </div>
        <div className="list">
          {members.map((m) => {
            const a = answers.get(m.userId);
            return (
              <div key={m.userId} className="list-row py-3">
                <Avatar user={m.user} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{personName(m.user)}</div>
                  <div className="truncate text-xs text-ink-3">
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
        <SectionTitle icon={Car}>Doprava</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          {event.cars.map((car) => {
            const free = car.seats - car.seatsTaken.length;
            const mySeat = car.seatsTaken.find((s) => s.userId === user.id);
            const isDriver = car.driverId === user.id;
            return (
              <div key={car.id} className="card">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                    <Car className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">{car.label || "Auto"}</div>
                    <div className="text-sm text-ink-2">
                      Řidič {personName(car.driver)}
                      {car.driver.phone && (
                        <>
                          {" · "}
                          <a className="link" href={`tel:${car.driver.phone}`}>
                            {car.driver.phone}
                          </a>
                        </>
                      )}
                    </div>
                    {(car.departureAt || car.departFrom) && (
                      <div className="text-xs text-ink-3">
                        Odjezd {fmtTime(car.departureAt)} {car.departFrom && `· ${car.departFrom}`}
                      </div>
                    )}
                    {car.note && <div className="mt-1 text-xs text-ink-3">{car.note}</div>}
                  </div>
                  <span className={`badge ${free > 0 ? "bg-ok-soft text-ok" : "bg-surface-2 text-ink-3"}`}>
                    {free > 0 ? `${free} volno` : "plno"}
                  </span>
                </div>
                {/* Sedadla */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {car.seatsTaken.map((seat) => (
                    <div key={seat.id} className="flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-1 pr-2 text-sm">
                      <Avatar user={seat.user} size="sm" />
                      <span className="max-w-[9rem] truncate">{personName(seat.user)}</span>
                      {(manager || isDriver || seat.userId === user.id) && (
                        <form action={leaveCar.bind(null, seat.id)}>
                          <SubmitButton className="ml-0.5 text-ink-3 hover:text-bad">
                            <CircleX className="h-4 w-4" />
                          </SubmitButton>
                        </form>
                      )}
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, free) }).map((_, i) => (
                    <span key={i} className="h-9 w-9 rounded-full border-2 border-dashed border-line" title="volné místo" />
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {myMembership && !isDriver && !mySeat && free > 0 && !iDrive && (
                    <form action={joinCar.bind(null, car.id)}>
                      <SubmitButton className="btn-primary btn-sm">{myCar ? "Přesednout sem" : "Pojedu tímto autem"}</SubmitButton>
                    </form>
                  )}
                  {manager && free > 0 && withoutCar.some((m) => m.userId !== car.driverId) && (
                    <form action={joinCar.bind(null, car.id)} className="flex gap-2">
                      <select name="userId" className="input min-h-[36px] py-1 text-xs">
                        {withoutCar
                          .filter((m) => m.userId !== car.driverId)
                          .map((m) => (
                            <option key={m.userId} value={m.userId}>
                              {personName(m.user)}
                            </option>
                          ))}
                      </select>
                      <SubmitButton className="btn-secondary btn-sm">Posadit</SubmitButton>
                    </form>
                  )}
                  {(manager || isDriver) && (
                    <form action={deleteCar.bind(null, car.id)}>
                      <SubmitButton className="btn-danger btn-sm" confirm="Odebrat auto?">
                        <Trash2 className="h-3.5 w-3.5" /> Odebrat
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {withoutCar.length > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-warn-soft p-3 text-sm text-warn">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Bez auta: {withoutCar.map((m) => personName(m.user)).join(", ")}</span>
          </p>
        )}

        {(myMembership || manager) && (!iDrive || manager) && (
          <details className="card group mt-3 p-0 sm:p-0">
            <summary className="flex cursor-pointer items-center gap-2 p-4 font-semibold text-brand">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft">
                <Plus className="h-4 w-4 transition group-open:rotate-45" />
              </span>
              Nabídnout auto
            </summary>
            <form action={addCar.bind(null, id)} className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
              {manager && (
                <div className="sm:col-span-2">
                  <label className="label">Řidič</label>
                  <select name="driverId" defaultValue={user.id} className="input">
                    {members
                      .filter((m) => !event.cars.some((c) => c.driverId === m.userId))
                      .map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {personName(m.user)}
                        </option>
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
        <SectionTitle icon={Vote}>Hlasování</SectionTitle>
        <div className="space-y-3">
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} userId={user.id} canManage={manager} canVote={!!myMembership} />
          ))}
          {(myMembership || manager) && <NewPollForm bandId={event.bandId} eventId={id} />}
        </div>
      </section>

      {manager && (
        <form action={deleteEvent.bind(null, id)} className="border-t border-line pt-6">
          <SubmitButton className="btn-danger" confirm="Opravdu smazat akci? Zmizí i z kalendářů členů.">
            <Trash2 className="h-4 w-4" /> Smazat akci
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
