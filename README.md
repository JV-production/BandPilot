# 🎸 BandPilot

Webová aplikace na správu a organizaci hudebních kapel: koncerty, místa, termíny, sestavy, záskoky, doprava,
hlasování a automatický zápis do Google Kalendáře. Běží v prohlížeči na počítači a jako instalovatelná aplikace
(PWA) na **iPhonu** i **Androidu** – stačí jedna adresa, není potřeba App Store ani Google Play.

## Co umí

| Kdo | Co může |
| --- | --- |
| **Organizátor** (`ADMIN`) | zakládá kapely, přidává uživatele (e-mailem) do kapel, nastavuje jim role a nástroje, spravuje všechny akce |
| **Vedoucí kapely** (`LEADER`) | vytváří a upravuje akce své kapely, skládá sestavu, přiděluje místa v autech |
| **Člen** (`MEMBER`) | vidí koncerty, odpovídá *hraju / možná / nemůžu*, nabízí auto nebo se do něj hlásí, hlasuje v anketách |
| **Alternace** (`SUBSTITUTE`) | totéž co člen, navíc se může přihlásit na uvolněnou pozici („Zahraju já“) |

- **Koncerty** – název, stav (v jednání / potvrzeno / zrušeno), klub a adresa (s odkazem na navigaci), sraz,
  časy odjezdu, get-inu, zvukovky, začátku a konce, kontakt, dress code, setlist, poznámky. **Honorář vidí jen
  organizátor** – členům, vedoucím ani do kalendářů se nezobrazuje.
- **Kdo hraje** – sestava se při vytvoření akce předvyplní stálými členy a jejich nástroji. Když někdo odpoví
  „nemůžu“, pozice se zvýrazní a vedoucí dosadí alternaci (nebo se alternace přihlásí sama).
- **Doprava** – kdokoli nabídne auto (počet míst, čas a místo odjezdu), ostatní se do něj zapíší. Aplikace ukazuje,
  kdo ještě nemá odvoz.
- **Honoráře** 🔒 – organizátor nastaví každému členovi výchozí sazbu za akci a u každé pozice v sestavě může
  částku upravit a označit jako vyplacenou. Honorář patří pozici, takže při záskoku ho dostane ten, kdo opravdu hraje.
  **Každý člen vidí jen svůj honorář** (u akce a na stránce *Honoráře*: odehráno, vyplaceno, zbývá doplatit,
  nadcházející, po letech). Organizátor vidí přehled všech. Celkový honorář akce a cizí částky nevidí nikdo jiný
  a do kalendářů se honoráře nezapisují vůbec.
- **Hlasování** – ankety pro celou kapelu nebo ke konkrétní akci, s jednou i více odpověďmi.
- **Google Kalendář** – každému členovi se akce zapíše přímo do jeho Google Kalendáře, personalizovaně:
  harmonogram, adresa + odkaz na navigaci, jeho pozice v sestavě, auto, řidič a spolujezdci, kontakty, setlist.
  Při každé změně (čas, sestava, auto…) se událost aktualizuje; kdo odpoví „nemůžu“, tomu zmizí; zrušená akce se
  označí. Navíc má každý tajnou **iCal adresu** pro Apple Kalendář / Outlook.

## Technologie

Next.js 15 (App Router, server actions) · React 19 · TypeScript · Tailwind CSS · Prisma + PostgreSQL · NextAuth (přihlášení přes Google) · Google Calendar API · PWA (manifest + service worker).

## Spuštění lokálně

```bash
# potřebujete běžící PostgreSQL (lokálně nebo zdarma na neon.tech)
npm install
cp .env.example .env          # a vyplňte hodnoty (viz níže)
npm run db:push               # vytvoří tabulky v databázi
npm run db:seed               # (volitelné) ukázková data
npm run dev                   # http://localhost:3000
```

Pro vyzkoušení bez Googlu nastavte `ENABLE_DEV_LOGIN="true"` – na přihlašovací stránce pak jde přihlásit jen
e-mailem (např. `organizator@example.com` nebo `petr@example.com` ze seedu). **V produkci nikdy nezapínejte.**

Testy a kontroly: `npm test`, `npm run typecheck`, `npm run lint`.

## Nastavení Google přihlášení a kalendáře

1. [Google Cloud Console](https://console.cloud.google.com/) → vytvořte projekt.
2. *APIs & Services → Library* → povolte **Google Calendar API**.
3. *OAuth consent screen* → typ *External*, přidejte scope `.../auth/calendar.events`. Dokud aplikace není
   ověřená Googlem, přidejte členy kapel jako *Test users* (max. 100), případně aplikaci nechte ověřit.
4. *Credentials → Create credentials → OAuth client ID* (Web application), redirect URI:
   `https://VASE-DOMENA/api/auth/callback/google` (a `http://localhost:3000/api/auth/callback/google` pro vývoj).
5. Client ID a Secret vložte do `GOOGLE_CLIENT_ID` a `GOOGLE_CLIENT_SECRET`, svůj e-mail do `ADMIN_EMAILS`.

## Jak to funguje v praxi

1. Organizátor se přihlásí (jeho e-mail je v `ADMIN_EMAILS`), založí kapelu a přidá do ní členy podle jejich
   Google e-mailu s rolí a nástrojem.
2. Členové se přihlásí přes Google – účet se automaticky spáruje a uvidí jen své kapely.
3. Organizátor/vedoucí vytvoří koncert → členům se objeví v aplikaci i v Google Kalendáři.
4. Členové odpovídají, řeší záskoky, auta a hlasují; kalendář se průběžně aktualizuje.

## Nasazení na web

Doporučené: **Vercel** + databáze **Neon** (obojí zdarma).

1. Na vercel.com se přihlaste přes GitHub → *Add New → Project* → importujte tento repozitář.
2. V projektu *Storage → Create Database → Neon* – Vercel sám nastaví `DATABASE_URL` a `DATABASE_URL_UNPOOLED`.
3. *Settings → Environment Variables*: `NEXTAUTH_URL` (veřejná adresa, např. `https://bandpilot.cz`),
   `NEXTAUTH_SECRET` (náhodný řetězec, např. `openssl rand -base64 32`), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `ADMIN_EMAILS`, `APP_TIMEZONE=Europe/Prague`, volitelně `CONTACT_EMAIL`.
4. *Deployments → Redeploy*. Tabulky v databázi se vytvoří automaticky při každém sestavení (`prisma db push`).
5. *Settings → Domains* → přidejte vlastní doménu a u registrátora nastavte DNS záznamy, které Vercel ukáže.
6. V Google Cloud doplňte redirect URI `https://VASE-DOMENA/api/auth/callback/google` a v *Branding* domovskou
   stránku, odkaz na `https://VASE-DOMENA/privacy` a autorizovanou doménu.

Aplikace musí běžet na **HTTPS** – jinak nejde nainstalovat do telefonu a Google přihlášení nefunguje.

## Telefony (iOS a Android)

Aplikace je PWA – po otevření adresy v telefonu:

- **iPhone / iPad (Safari):** tlačítko *Sdílet* → **Přidat na plochu**.
- **Android (Chrome):** menu ⋮ → **Nainstalovat aplikaci** (nebo nabídka se objeví sama).

Spustí se na celou obrazovku s vlastní ikonou, spodní navigací a ohledem na výřez displeje. Kdo chce aplikaci
přímo v App Store / Google Play, lze ji později zabalit pomocí [Capacitor](https://capacitorjs.com/) – kód se
nemění, jen se přidá nativní obal.

## Struktura

```
prisma/schema.prisma        datový model (uživatelé, kapely, členství, akce, docházka, sestava, auta, ankety, kalendář)
src/app/                    stránky (přehled, kapely, akce, uživatelé, nastavení) a API (auth, iCal)
src/app/actions/            server actions – všechny změny dat včetně kontroly oprávnění
src/lib/event-details.ts    obsah události v kalendáři (personalizovaný popis, komu se zapisuje)
src/lib/google-calendar.ts  synchronizace s Google Kalendářem
src/lib/ics.ts              iCal feed
public/sw.js                service worker (PWA, offline stránka)
```
