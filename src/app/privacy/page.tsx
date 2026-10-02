import Link from "next/link";

export const metadata = { title: "Zásady ochrany osobních údajů" };

const contactEmail = () =>
  process.env.CONTACT_EMAIL || (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim() || "";

export default function PrivacyPage() {
  const email = contactEmail();
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="text-sm text-brand-600">← BandPilot</Link>
      <article className="card mt-3 space-y-4 text-sm leading-relaxed text-slate-700 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900">
        <h1 className="text-2xl font-extrabold text-slate-900">Zásady ochrany osobních údajů</h1>
        <p>
          BandPilot je aplikace pro organizaci hudebních kapel – koncertů, sestav, dopravy a hlasování. Aplikaci
          provozuje organizátor kapel{email && <> (kontakt: <a className="text-brand-600" href={`mailto:${email}`}>{email}</a>)</>}.
          Přístup do aplikace mají jen lidé, kterým ho organizátor přidělil.
        </p>

        <h2>Jaké údaje zpracováváme</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Z vašeho Google účtu: jméno, e-mailovou adresu a profilovou fotografii.</li>
          <li>Údaje, které sami zadáte: telefon, odpovědi na účast, místa v autech, hlasy v anketách.</li>
          <li>Údaje o kapelách a akcích zadané organizátorem, včetně vaší role, nástroje a honorářů. Honoráře vidí jen organizátor a dotčený člen.</li>
        </ul>

        <h2>Přístup ke Google Kalendáři</h2>
        <p>
          Pokud se přihlásíte přes Google, požádáme o oprávnění spravovat události ve vašem kalendáři
          (<code>calendar.events</code>). Používáme ho výhradně k tomu, abychom do vašeho hlavního kalendáře zapsali akce
          vašich kapel, aktualizovali je při změně a smazali je, pokud se akce zruší nebo na ní nehrajete. Jiné události ve
          vašem kalendáři nečteme, neměníme ani neukládáme. Synchronizaci můžete kdykoli vypnout v Nastavení aplikace a
          přístup odebrat na stránce{" "}
          <a className="text-brand-600" href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
            myaccount.google.com/permissions
          </a>.
        </p>
        <p>
          Využití informací získaných z Google API je v souladu se zásadami{" "}
          <a className="text-brand-600" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
            Google API Services User Data Policy
          </a>
          , včetně požadavků na omezené použití (Limited Use).
        </p>

        <h2>Komu údaje zpřístupňujeme</h2>
        <p>
          Údaje vidí jen členové stejné kapely a organizátor, v rozsahu potřebném pro organizaci akcí. Údaje neprodáváme,
          nepoužíváme k reklamě ani je nepředáváme dalším stranám. Aplikace běží u poskytovatelů hostingu (Vercel) a
          databáze (Neon), kteří údaje zpracovávají jen pro její provoz.
        </p>

        <h2>Uchování a smazání</h2>
        <p>
          Údaje uchováváme po dobu, kdy aplikaci používáte. O smazání svého účtu a údajů můžete kdykoli požádat
          organizátora{email && <> na adrese <a className="text-brand-600" href={`mailto:${email}`}>{email}</a></>}.
          Smazáním účtu se odstraní i vaše odpovědi, místa v autech a hlasy.
        </p>

        <h2>Vaše práva</h2>
        <p>
          Podle GDPR máte právo na přístup ke svým údajům, jejich opravu, výmaz, omezení zpracování a přenositelnost a
          právo podat stížnost u Úřadu pro ochranu osobních údajů (www.uoou.cz).
        </p>
      </article>
    </div>
  );
}
