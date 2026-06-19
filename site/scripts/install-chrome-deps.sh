#!/usr/bin/env bash
# Системные библиотеки для Chrome, который скачивает Puppeteer (пререндер SEO).
# Ubuntu 22.04 / 24.04. Запуск: sudo bash scripts/install-chrome-deps.sh

set -euo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Запустите от root: sudo bash scripts/install-chrome-deps.sh"
  exit 1
fi

echo "Установка зависимостей Chrome для Puppeteer..."

apt-get update

# Ubuntu 24.04+ (пакеты с суффиксом t64)
if apt-cache show libatk1.0-0t64 &>/dev/null; then
  apt-get install -y \
    ca-certificates fonts-liberation wget \
    libasound2t64 libatk-bridge2.0-0t64 libatk1.0-0t64 \
    libcairo2 libcups2t64 libdbus-1-3 libdrm2 libexpat1 \
    libfontconfig1 libgbm1 libglib2.0-0t64 libgtk-3-0t64 \
    libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 \
    libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxdamage1 \
    libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6
else
  apt-get install -y \
    ca-certificates fonts-liberation wget \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libcairo2 libcups2 libdbus-1-3 libdrm2 libexpat1 \
    libfontconfig1 libgbm1 libglib2.0-0 libgtk-3-0 \
    libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 \
    libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxdamage1 \
    libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6
fi

echo "Готово. Проверка: cd /opt/onthewater-app/site && npm run build"
