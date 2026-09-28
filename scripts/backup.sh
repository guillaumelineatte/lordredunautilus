#!/usr/bin/env bash
# Sauvegarde complète de la base (pg_dump au format custom, compressé).
#
#   ./scripts/backup.sh                 prend DIRECT_URL dans le .env
#   DIRECT_URL="postgres://..." ./scripts/backup.sh
#
# Il faut les outils client PostgreSQL 16 ou plus (sur mac : brew install libpq && brew link --force libpq).
# Le fichier contient des données perso : à ranger chiffré, hors du dépôt,
# et à supprimer au bout de 12 mois.
set -euo pipefail

cd "$(dirname "$0")/.."
if [[ -z "${DIRECT_URL:-}" && -f .env ]]; then
  DIRECT_URL="$(grep -E '^DIRECT_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')"
fi
: "${DIRECT_URL:?DIRECT_URL manquante (URL directe Neon, sans -pooler)}"

mkdir -p backups
file="backups/nautilus-$(date +%Y%m%d-%H%M).dump"
pg_dump --format=custom --no-owner --no-privileges --dbname="$DIRECT_URL" --file="$file"
chmod 600 "$file"
echo "✔ Sauvegarde écrite : $file ($(du -h "$file" | cut -f1))"
