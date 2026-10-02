#!/bin/sh
# Sestavení pro Vercel: vytvoří/aktualizuje tabulky v databázi a sestaví aplikaci.
set -e

# Lokální vývoj: načíst .env (na Vercelu jsou proměnné nastavené přímo)
if [ -z "$DATABASE_URL" ] && [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

if [ -z "$DATABASE_URL" ]; then
  echo "CHYBA: Chybí proměnná DATABASE_URL. Připojte databázi (Vercel → Storage → Neon) a spusťte nasazení znovu." >&2
  exit 1
fi
# Přímé připojení k databázi; když ho hosting nenastaví, použije se běžné.
export DATABASE_URL_UNPOOLED="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"

prisma generate
prisma db push --skip-generate
next build
