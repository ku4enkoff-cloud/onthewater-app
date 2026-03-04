#!/bin/bash
# Обновление кода с GitHub и перезапуск API на сервере.
# Запуск на сервере: bash scripts/deploy-api.sh   или   ./scripts/deploy-api.sh

set -e

PROJECT_DIR="${PROJECT_DIR:-/opt/onthewater-app}"
BRANCH="${BRANCH:-2026-02-27-gt1h}"
SERVICE_NAME="${SERVICE_NAME:-boatrent-api.service}"

echo "=== Deploy API: $PROJECT_DIR, branch $BRANCH ==="
cd "$PROJECT_DIR"

echo "--- Git pull ---"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "--- Backend: npm install (если нужно) ---"
cd "$PROJECT_DIR/backend"
npm ci --omit=dev

echo "--- Перезапуск API ---"
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl status "$SERVICE_NAME" --no-pager

echo "=== Готово ==="
