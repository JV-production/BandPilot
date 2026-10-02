import { CalendarCheck, CalendarX2, Link2, RefreshCw, Smartphone, UserRound } from "lucide-react";
import { regenerateCalendarToken, resyncMyCalendar, updateProfile } from "@/app/actions/users";
import { requireUser } from "@/lib/auth";
import { appUrl, hasGoogleCalendar } from "@/lib/google-calendar";
import { USER_ROLE } from "@/lib/labels";
import { SubmitButton } from "@/components/SubmitButton";
import { Avatar, PageHeader, SectionTitle } from "@/components/ui";
import { SignOutButton } from "./SignOutButton";
import { CopyField } from "./CopyField";

export const metadata = { title: "Nastavení" };

export default async function SettingsPage() {
  const user = await requireUser();
  const google = await hasGoogleCalendar(user.id);
  const icsUrl = `${appUrl()}/api/calendar/${user.calendarToken}`;
  const webcalUrl = icsUrl.replace(/^https?:/, "webcal:");

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="Nastavení" />

      <div className="card flex items-center gap-4">
        <Avatar user={user} size="lg" />
        <div className="min-w-0">
          <div className="truncate text-lg font-bold">{user.name || "Bez jména"}</div>
          <div className="truncate text-sm text-ink-2">{user.email}</div>
          <span className="badge mt-1 bg-brand-soft text-brand">{USER_ROLE[user.role]}</span>
        </div>
      </div>

      <section>
        <SectionTitle icon={UserRound}>Profil</SectionTitle>
        <form action={updateProfile} className="card space-y-4">
          <div>
            <label className="label">Jméno</label>
            <input name="name" defaultValue={user.name ?? ""} className="input" />
          </div>
          <div>
            <label className="label">Telefon · uvidí ho členové tvých kapel</label>
            <input name="phone" type="tel" defaultValue={user.phone ?? ""} className="input" placeholder="+420 …" />
          </div>
          <label className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 p-3 text-sm font-medium">
            Zapisovat koncerty do Google Kalendáře
            <input type="checkbox" name="calendarSync" defaultChecked={user.calendarSync} className="h-5 w-5 accent-[rgb(var(--brand))]" />
          </label>
          <SubmitButton>Uložit</SubmitButton>
        </form>
      </section>

      <section>
        <SectionTitle icon={CalendarCheck}>Google Kalendář</SectionTitle>
        <div className="card space-y-3">
          {google ? (
            <>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ok-soft text-ok">
                  <CalendarCheck className="h-5 w-5" />
                </span>
                <p className="text-sm text-ink-2">
                  <b className="text-ink">Propojeno.</b> Koncerty se ti automaticky zapisují do kalendáře včetně odjezdu, adresy,
                  zvukovky, sestavy a auta. Při každé změně se aktualizují.
                </p>
              </div>
              <form action={resyncMyCalendar}>
                <SubmitButton className="btn-secondary btn-sm">
                  <RefreshCw className="h-3.5 w-3.5" /> Znovu synchronizovat
                </SubmitButton>
              </form>
            </>
          ) : (
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-warn-soft text-warn">
                <CalendarX2 className="h-5 w-5" />
              </span>
              <p className="text-sm text-ink-2">
                <b className="text-ink">Nepropojeno.</b> Odhlas se a přihlas znovu přes Google – na obrazovce souhlasu zaškrtni
                přístup ke kalendáři. Nebo použij odběr kalendáře níže.
              </p>
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionTitle icon={Link2}>Odběr kalendáře</SectionTitle>
        <div className="card space-y-3">
          <p className="text-sm text-ink-2">
            Pro Apple Kalendář, Outlook a další. Adresa je tajná – nesdílej ji.
          </p>
          <CopyField value={icsUrl} />
          <div className="flex flex-wrap gap-2">
            <a href={webcalUrl} className="btn-secondary btn-sm">
              Přidat do Apple Kalendáře
            </a>
            <form action={regenerateCalendarToken}>
              <SubmitButton className="btn-danger btn-sm" confirm="Vygenerovat novou adresu? Stará přestane fungovat.">
                Nová adresa
              </SubmitButton>
            </form>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle icon={Smartphone}>Aplikace v telefonu</SectionTitle>
        <div className="list">
          <div className="list-row text-sm">
            <span className="w-20 shrink-0 font-semibold">iPhone</span>
            <span className="text-ink-2">Safari → Sdílet → „Přidat na plochu“</span>
          </div>
          <div className="list-row text-sm">
            <span className="w-20 shrink-0 font-semibold">Android</span>
            <span className="text-ink-2">Chrome → menu ⋮ → „Nainstalovat aplikaci“</span>
          </div>
        </div>
      </section>

      <SignOutButton />
    </div>
  );
}
