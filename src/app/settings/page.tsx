import { regenerateCalendarToken, resyncMyCalendar, updateProfile } from "@/app/actions/users";
import { requireUser } from "@/lib/auth";
import { appUrl, hasGoogleCalendar } from "@/lib/google-calendar";
import { USER_ROLE } from "@/lib/labels";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader } from "@/components/ui";
import { SignOutButton } from "./SignOutButton";
import { CopyField } from "./CopyField";

export const metadata = { title: "Nastavení" };

export default async function SettingsPage() {
  const user = await requireUser();
  const google = await hasGoogleCalendar(user.id);
  const icsUrl = `${appUrl()}/api/calendar/${user.calendarToken}`;
  const webcalUrl = icsUrl.replace(/^https?:/, "webcal:");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Nastavení" subtitle={`${user.email} · ${USER_ROLE[user.role]}`} />

      <form action={updateProfile} className="card space-y-4">
        <h2 className="section-title">Profil</h2>
        <div>
          <label className="label">Jméno</label>
          <input name="name" defaultValue={user.name ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Telefon (uvidí ho ostatní členové kapely)</label>
          <input name="phone" type="tel" defaultValue={user.phone ?? ""} className="input" />
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="calendarSync" defaultChecked={user.calendarSync} className="h-5 w-5 accent-brand-600" />
          Zapisovat koncerty do mého Google Kalendáře
        </label>
        <SubmitButton>Uložit</SubmitButton>
      </form>

      <section className="card space-y-3">
        <h2 className="section-title">📅 Google Kalendář</h2>
        {google ? (
          <>
            <p className="text-sm text-slate-600">
              ✅ Účet je propojený. Každý koncert se ti automaticky zapíše do kalendáře včetně času odjezdu, adresy,
              zvukovky, sestavy a auta, kterým jedeš. Při každé změně se událost aktualizuje.
            </p>
            <form action={resyncMyCalendar}>
              <SubmitButton className="btn-secondary">Znovu synchronizovat vše</SubmitButton>
            </form>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            Přímá synchronizace funguje po přihlášení přes Google. Můžeš použít i odběr kalendáře níže.
          </p>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">🔗 Odběr kalendáře (iPhone, Outlook, jiné)</h2>
        <p className="text-sm text-slate-600">
          Tuto adresu můžeš přidat do libovolného kalendáře (Apple Kalendář, Google „Přidat z URL“, Outlook). Adresa je
          tajná – nesdílej ji.
        </p>
        <CopyField value={icsUrl} />
        <div className="flex flex-wrap gap-2">
          <a href={webcalUrl} className="btn-secondary btn-sm">Přidat do Apple Kalendáře</a>
          <form action={regenerateCalendarToken}>
            <SubmitButton className="btn-danger btn-sm" confirm="Vygenerovat novou adresu? Stará přestane fungovat.">
              Vygenerovat novou adresu
            </SubmitButton>
          </form>
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="section-title">📱 Aplikace v telefonu</h2>
        <p className="text-sm text-slate-600">
          <b>iPhone (Safari):</b> Sdílet → „Přidat na plochu“.<br />
          <b>Android (Chrome):</b> menu ⋮ → „Nainstalovat aplikaci“ / „Přidat na plochu“.
        </p>
      </section>

      <SignOutButton />
    </div>
  );
}
