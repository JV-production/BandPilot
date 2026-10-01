import type { Event } from "@prisma/client";
import { toLocalInput } from "@/lib/time";
import { SubmitButton } from "./SubmitButton";

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
        {required && " *"}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        placeholder={placeholder}
        className="input"
      />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function EventForm({
  action,
  event,
  submitLabel,
  showFee,
}: {
  action: (fd: FormData) => Promise<void>;
  event?: Event;
  submitLabel: string;
  /** Honorář vidí a upravuje jen organizátor. */
  showFee: boolean;
}) {
  return (
    <form action={action} className="space-y-5">
      <section className="card space-y-4">
        <h2 className="section-title">Základní informace</h2>
        <Field label="Název akce" name="title" required defaultValue={event?.title} placeholder="Např. Letní festival" />
        <div>
          <label className="label" htmlFor="status">Stav</label>
          <select id="status" name="status" defaultValue={event?.status ?? "PLANNED"} className="input">
            <option value="PLANNED">V jednání</option>
            <option value="CONFIRMED">Potvrzeno</option>
            <option value="CANCELLED">Zrušeno</option>
          </select>
        </div>
      </section>

      <section className="card grid gap-4 sm:grid-cols-2">
        <h2 className="section-title sm:col-span-2">Místo</h2>
        <Field label="Klub / místo konání" name="venueName" defaultValue={event?.venueName} />
        <Field label="Adresa" name="venueAddress" defaultValue={event?.venueAddress} placeholder="Ulice, město" />
        <Field
          label="Sraz před odjezdem"
          name="meetingPoint"
          defaultValue={event?.meetingPoint}
          placeholder="Např. zkušebna, Praha 7"
        />
      </section>

      <section className="card grid gap-4 sm:grid-cols-2">
        <h2 className="section-title sm:col-span-2">Harmonogram</h2>
        <Field label="Odjezd" name="departureAt" type="datetime-local" defaultValue={toLocalInput(event?.departureAt)} />
        <Field label="Příjezd / get-in" name="getInAt" type="datetime-local" defaultValue={toLocalInput(event?.getInAt)} />
        <Field label="Zvuková zkouška" name="soundcheckAt" type="datetime-local" defaultValue={toLocalInput(event?.soundcheckAt)} />
        <Field label="Začátek vystoupení" name="startAt" type="datetime-local" required defaultValue={toLocalInput(event?.startAt)} />
        <Field label="Konec" name="endAt" type="datetime-local" defaultValue={toLocalInput(event?.endAt)} hint="Když nevyplníte, počítá se 3 h od začátku." />
      </section>

      <section className="card grid gap-4 sm:grid-cols-2">
        <h2 className="section-title sm:col-span-2">Další informace</h2>
        <Field label="Kontaktní osoba" name="contactName" defaultValue={event?.contactName} />
        <Field label="Telefon na kontakt" name="contactPhone" type="tel" defaultValue={event?.contactPhone} />
        {showFee && (
          <Field label="Honorář 🔒" name="fee" defaultValue={event?.fee} hint="Vidí jen organizátor – členům ani do kalendáře se nezobrazuje." />
        )}
        <Field label="Dress code" name="dressCode" defaultValue={event?.dressCode} />
        <div className="sm:col-span-2">
          <label className="label" htmlFor="setlist">Setlist</label>
          <textarea id="setlist" name="setlist" rows={4} defaultValue={event?.setlist ?? ""} className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="notes">Poznámky</label>
          <textarea id="notes" name="notes" rows={3} defaultValue={event?.notes ?? ""} className="input" />
        </div>
      </section>

      <div className="sticky bottom-20 z-10 md:bottom-4">
        <SubmitButton className="btn-primary w-full shadow-lg">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
