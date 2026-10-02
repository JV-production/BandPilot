#!/bin/sh
# Sestavení pro Vercel: vytvoří/aktualizuje tabulky v databázi a sestaví aplikaci.
set -e

# Lokální vývoj: načíst .env (na Vercelu jsou proměnné nastavené přímo)
if [ -z "$VERCEL_ENV" ] && [ -z "$DATABASE_URL" ] && [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

if [ "$VERCEL_ENV" = "preview" ]; then
  # Náhled má vlastní databázi – nikdy nesahá na ostrá data.
  if [ -z "$PREVIEW_DATABASE_URL" ]; then
    echo "CHYBA: Náhled nemá vlastní databázi. Vercel → Storage → Neon (prefix PREVIEW, jen prostředí Preview)." >&2
    exit 1
  fi
  export DATABASE_URL="$PREVIEW_DATABASE_URL"
  export DATABASE_URL_UNPOOLED="${PREVIEW_DATABASE_URL_UNPOOLED:-$PREVIEW_DATABASE_URL}"
else
  if [ -z "$DATABASE_URL" ]; then
    echo "CHYBA: Chybí proměnná DATABASE_URL. Připojte databázi (Vercel → Storage → Neon) a spusťte nasazení znovu." >&2
    exit 1
  fi
  # Přímé připojení k databázi; když ho hosting nenastaví, použije se běžné.
  export DATABASE_URL_UNPOOLED="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"
fi

prisma generate
prisma db push --skip-generate

# Testovací data jen v náhledu (a jen když je to výslovně zapnuté).
if [ "$VERCEL_ENV" = "preview" ] && [ "$SEED_PREVIEW" = "true" ]; then
  echo "Náhled: nahrávám testovací data…"
  tsx prisma/seed.ts
fi

next build
