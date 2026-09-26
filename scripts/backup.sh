#!/usr/bin/env bash
# Sauvegarde complète de la base (format pg_dump « custom », compressé).
#
#   ./scripts/backup.sh                 → utilise DIRECT_URL du fichier .env
#   DIRECT_URL="postgres://…" ./scripts/backup.sh
#
# Prérequis : outils clients PostgreSQL ≥ 16 (macOS : brew install libpq && brew link --force libpq).
# Le fichier produit contient des données personnelles : stockez-le chiffré,
# hors du dépôt, et supprimez les sauvegardes de plus de 12 mois.
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
