# ONTHEWATER — мобильное приложение (клиент и владелец)

Один репозиторий, два варианта сборки: **client** и **owner** (`EXPO_PUBLIC_APP_VARIANT`). Конфигурация: [app.config.js](./app.config.js).

## iOS: сборка приложения владельца для App Store (EAS)

### Bundle ID

| Вариант | `ios.bundleIdentifier` | Android `package` |
|--------|-------------------------|-------------------|
| Владелец | `com.anonymous.onthewater.owner` | `com.anonymous.onthewater.owner` |
| Клиент | `ru.onthewater.client` | `com.anonymous.onthewater` |

В [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list) создайте **App ID** с тем же Bundle ID, что для owner в `app.config.js`.

### App Store Connect (вручную)

1. [App Store Connect](https://appstoreconnect.apple.com/) → «Мои приложения» → **+** → новое приложение.
2. Укажите тот же **Bundle ID**, что зарегистрирован в Developer (например `com.anonymous.onthewater.owner`).
3. После загрузки билда заполните метаданные, скриншоты, политику конфиденциальности и отправьте на ревью.

### Переменные окружения для релиза владельца

Скопируйте [.env.example](./.env.example) в `.env`. Для сборки owner на EAS задайте секреты в **[Expo → проект → Environment variables](https://expo.dev)** для профиля **production** или передайте через `eas secret:create`, например:

- `EXPO_PUBLIC_API_URL` — базовый URL API (если не задан, в release используется прод из [config.js](./src/shared/infrastructure/config.js)).
- `EXPO_PUBLIC_APPMETRICA_API_KEY_OWNER` — AppMetrica для владельца.
- `EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY`, `EXPO_PUBLIC_YANDEX_GEO_SUGGEST_API_KEY` — при необходимости переопределить ключи карт.

Локальный `.env` при облачном `eas build` **не подставляется автоматически** — используйте EAS Environment Variables или `--env-file` где поддерживается.

### Первая сборка iOS (credentials)

Первый запуск нужен **интерактивно**, чтобы EAS создал/привязал сертификаты Apple:

```bash
cd mobile
npx eas-cli login
npx eas-cli build --platform ios --profile production-owner
```

Следуйте подсказкам («Let Expo handle credentials» / вход Apple ID или API Key App Store Connect). После настройки можно использовать `--non-interactive` в CI.

### Повторные сборки

```bash
cd mobile
npx eas-cli build --platform ios --profile production-owner
```

Профиль задан в [eas.json](./eas.json): `production-owner` выставляет `EXPO_PUBLIC_APP_VARIANT=owner`.

### Загрузка билда в App Store Connect

После успешной сборки:

```bash
npx eas-cli submit --platform ios --latest
```

Либо скачайте `.ipa` со страницы сборки Expo и загрузите через **Transporter**.

### Замечание про `slug`

Используется единый `slug: onthewater` в `app.config.js`, чтобы совпадать с `extra.eas.projectId` на [expo.dev](https://expo.dev). Имя для пользователя и Bundle ID по-прежнему различают клиента и владельца.

## iOS TestFlight: серая сетка вместо карты (клиент)

Симптом: в модалке «катера на карте» видны кластеры/маркеры, но **нет тайлов** (серая сетка), логотип Яндекса есть.

**Причина:** ключ [MapKit Mobile SDK](https://developer.tech.yandex.ru) не привязан к Bundle ID сборки или не задан в EAS при `eas build`.

1. [developer.tech.yandex.ru](https://developer.tech.yandex.ru) → ключ → включить **MapKit Mobile SDK**.
2. В ограничениях ключа добавить **iOS**: `ru.onthewater.client` (клиент) или `com.anonymous.onthewater.owner` (владелец). Подождать ~15 минут после сохранения.
3. В [Expo → Environment variables](https://expo.dev) для профиля production задать `EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY` (локальный `.env` в облачную сборку не попадает).
4. Пересобрать клиентский iOS-билд:

```bash
cd mobile
npx eas-cli build --platform ios --profile production-client
```

Плагин `plugins/withYandexMapKitKey.js` при prebuild прописывает ключ в AndroidManifest и **AppDelegate** (iOS). JS-инициализация: `src/shared/yamapInit.js`.
