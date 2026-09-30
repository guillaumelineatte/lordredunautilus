#!/usr/bin/env bash
# Déploiement sur Vercel.
#
#   npm run deploy:test   version de test  https://lordredunautilus-test.vercel.app (branche Neon "test")
#   npm run deploy:prod   production       https://lordredunautilus.vercel.app (branche Neon "production")
#
# Chaque version a ses propres variables sur Vercel (Preview pour le test, Production
# pour la prod) : base, secrets, adresse et stockage des photos ne se mélangent pas.
set -euo pipefail

TEST_DOMAIN="lordredunautilus-test.vercel.app"

case "${1:-}" in
  test)
    # vercel deploy écrit l'adresse du déploiement sur la sortie standard
    url=$(vercel deploy --yes --archive=tgz)
    vercel alias set "$url" "$TEST_DOMAIN"
    echo "Version de test en ligne : https://$TEST_DOMAIN"
    ;;
  prod)
    vercel deploy --prod --yes --archive=tgz
    ;;
  *)
    echo "usage : scripts/deploy.sh test|prod" >&2
    exit 1
    ;;
esac
