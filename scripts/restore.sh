#!/usr/bin/env bash
# Restauration d'une sauvegarde produite par backup.sh.
#
#   ./scripts/restore.sh backups/nautilus-20261001-0600.dump "postgres://…cible…"
#
# ⚠️ Remplace le contenu de la base cible. Recommandé : restaurer d'abord dans
# une nouvelle branche Neon, vérifier, puis basculer l'application dessus.
set -euo pipefail

dump="${1:?Chemin du fichier .dump attendu}"
target="${2:?URL de la base cible attendue (connexion directe, sans -pooler)}"
[[ -f "$dump" ]] || { echo "Fichier introuvable : $dump" >&2; exit 1; }

host="$(echo "$target" | sed -E 's#^[a-z]+://[^@]+@([^/:?]+).*#\1#')"
read -r -p "Restaurer $dump dans $host ? Le contenu actuel sera remplacé. Tapez « oui » : " answer
[[ "$answer" == "oui" ]] || { echo "Annulé."; exit 1; }

pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$target" "$dump"
echo "✔ Restauration terminée. Vérifiez le site, puis lancez « npx prisma migrate deploy » si le schéma a évolué depuis la sauvegarde."
