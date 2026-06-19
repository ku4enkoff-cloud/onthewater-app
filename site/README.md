# ONTHEWATER — сайт onthewater.ru

React + Vite SPA для поиска и бронирования катеров.

## Разработка

```bash
npm install
npm run dev
```

В dev запросы к API идут через Vite proxy на `localhost:3000` (см. `vite.config.js`). Запустите бэкенд отдельно.

## Сборка и SEO

На **сервере** перед первой сборкой или после `git pull`:

```bash
cd /opt/onthewater-app/site
npm install          # нужны devDependencies (vite, puppeteer)
npm run build
```

Если ставите только production-зависимости (`npm ci --omit=dev`), используйте:

```bash
npm run build:no-prerender
```

Сборка завершится без ошибки; пререндер для краулеров можно сделать на своём ПК (`npm run build`) и залить готовый `dist/`.

Полная сборка с пререндером:

```bash
npm run build
```

**Пререндер на Ubuntu-сервере** требует библиотеки Chrome (ошибка `libatk-1.0.so.0` и т.п.):

```bash
sudo bash scripts/install-chrome-deps.sh
npm run build
```

Или без пререндера на сервере: `npm run build:no-prerender` (sitemap и клиентский SEO в бандле останутся; статический HTML для ботов — соберите на ПК и залейте `dist/`).

Скрипт сборки:

1. **`scripts/generate-sitemap.mjs`** — `public/sitemap.xml` и список маршрутов для пререндера (нужен доступ к API).
2. **`vite build`** — бандл в `dist/`.
3. **`scripts/prerender.mjs`** — Puppeteer сохраняет HTML для главной, лендинга владельцев, юридических страниц и карточек катеров (страница `/boats` не пререндерится в `dist/boats/index.html`, чтобы не ломать вложенные URL катеров).

Переменные окружения (см. `.env.example`):

| Переменная | Назначение |
|------------|------------|
| `VITE_API_URL` | API для каталога при генерации sitemap и пререндера |
| `VITE_PUBLIC_SITE_URL` | Canonical и Open Graph (`https://onthewater.ru`) |
| `VITE_MAIN_SITE_URL` | Маркетинговые ссылки в приложении |
| `SKIP_PRERENDER` | `1` — собрать без пререндера |

Без доступа к API sitemap и пререндер всё равно создадут статические URL; страницы катеров появятся после успешного запроса к `/boats`.

## Деплой (Nginx)

Корень сайта — содержимое `dist/`. Для SPA и пререндеренных путей:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Так `dist/boats/42-slug/index.html` отдаётся напрямую краулерам, остальные маршруты — через `index.html`.

Убедитесь, что доступны:

- `/robots.txt`
- `/sitemap.xml`
- `/og-default.webp`

После деплоя добавьте sitemap в [Яндекс Вебмастер](https://webmaster.yandex.ru) и Google Search Console.

## SEO в коде

- `src/seo/documentSeo.js` — общие meta-теги и JSON-LD
- Хуки: `useHomePageSeo`, `useBoatsSearchPageSeo`, `useBoatDetailPageSeo`, `useOwnerLandingSeo`, `useNoIndexSeo`
- `/login`, `/register`, `/account` — `noindex`
