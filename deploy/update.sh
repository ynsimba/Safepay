#!/usr/bin/env bash
# Mise à jour production SafePay — lancé par GitHub Actions (user safecheck).
set -euo pipefail

APP_ROOT=/var/www/safepay
LOCK="${APP_ROOT}/backend/storage/deploy.lock"

cd "$APP_ROOT"

mkdir -p "$(dirname "$LOCK")"
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "Un autre déploiement est déjà en cours."
  exit 1
fi

echo "==> git"
git fetch origin
git reset --hard origin/main
sed -i 's/\r$//' "${APP_ROOT}/deploy/update.sh" || true
chmod +x "${APP_ROOT}/deploy/update.sh"

echo "==> composer"
cd "${APP_ROOT}/backend"
composer install --no-dev --optimize-autoloader --no-interaction --no-progress

echo "==> migrate (sans seed)"
php artisan migrate --force

echo "==> caches Laravel"
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan queue:restart

echo "==> frontend"
cd "$APP_ROOT"
npm ci
npm run build
chmod 755 "$APP_ROOT"
chmod -R a+rX dist
chmod -R ug+rwX backend/storage backend/bootstrap/cache
chmod 640 "${APP_ROOT}/backend/.env" 2>/dev/null || true

if sudo -n /bin/systemctl reload php8.4-fpm >/dev/null 2>&1; then
  echo "==> php-fpm rechargé"
fi

echo "==> OK $(git rev-parse --short HEAD)"
