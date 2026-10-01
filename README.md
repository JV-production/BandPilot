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
  časy odjezdu, get-inu, zvukovky, začátku a konce, kontakt, honorář, dress code, setlist, poznámky.
- **Kdo hraje** – sestava se při vytvoření akce předvyplní stálými členy a jejich nástroji. Když někdo odpoví
  „nemůžu“, pozice se zvýrazní a vedoucí dosadí alternaci (nebo se alternace přihlásí sama).
- **Doprava** – kdokoli nabídne auto (počet míst, čas a místo odjezdu), ostatní se do něj zapíší. Aplikace ukazuje,
  kdo ještě nemá odvoz.
- **Hlasování** – ankety pro celou kapelu nebo ke konkrétní akci, s jednou i více odpověďmi.
- **Google Kalendář** – každému členovi se akce zapíše přímo do jeho Google Kalendáře, personalizovaně:
  harmonogram, adresa + odkaz na navigaci, jeho pozice v sestavě, auto, řidič a spolujezdci, kontakty, setlist.
  Při každé změně (čas, sestava, auto…) se událost aktualizuje; kdo odpoví „nemůžu“, tomu zmizí; zrušená akce se
  označí. Navíc má každý tajnou **iCal adresu** pro Apple Kalendář / Outlook.

## Technologie

Next.js 15 (App Router, server actions) · React 19 · TypeScript · Tailwind CSS · Prisma (SQLite pro vývoj,
PostgreSQL pro produkci) · NextAuth (přihlášení přes Google) · Google Calendar API · PWA (manifest + service worker).

## Spuštění lokálně

```bash
npm install
cp .env.example .env          # a vyplňte hodnoty (viz níže)
npm run db:push               # vytvoří databázi
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

Doporučené: **Vercel** + **PostgreSQL** (Neon, Supabase, Vercel Postgres…).

1. V `prisma/schema.prisma` změňte `provider = "sqlite"` na `provider = "postgresql"`.
2. Na Vercelu nastavte proměnné z `.env.example` (`DATABASE_URL`, `NEXTAUTH_URL` = veřejná adresa,
   `NEXTAUTH_SECRET` = `openssl rand -base64 32`, Google klíče, `ADMIN_EMAILS`, `APP_TIMEZONE`).
3. Po prvním nasazení spusťte `npx prisma db push` proti produkční databázi.

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
