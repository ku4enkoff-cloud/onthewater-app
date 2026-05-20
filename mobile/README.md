# ONTHEWATER — мобильное приложение (клиент и владелец)

Один репозиторий, два варианта сборки: **client** и **owner** (`EXPO_PUBLIC_APP_VARIANT`). Конфигурация: [app.config.js](./app.config.js).

## iOS owner: сборка в Xcode (ошибка «No script URL provided»)

Красный экран **No script URL provided** значит: нативное приложение запустилось, но **не нашло JS** (ни Metro, ни встроенный `main.jsbundle`).

### Почему в Xcode открывается клиент, а не owner

Две причины:

1. **Папка `ios/` собрана под клиента** (`prebuild:client:ios` или старый prebuild) — в нативном проекте зашито `extra.appVariant: client`, другое имя, иконка, Bundle ID `ru.onthewater.client`.
2. **Metro** — даже при `start:owner` раньше в коде приоритет был у значения из prebuild; сейчас в dev побеждает `EXPO_PUBLIC_APP_VARIANT` из Metro (см. `src/shared/appVariant.js`).

Для **релиза и Archive** всё равно нужен **`prebuild:owner:ios`**, иначе Bundle ID и нативный конфиг останутся клиентскими.

### Перед сборкой owner в Xcode (обязательно)

Папку `ios/` **нельзя** переиспользовать от клиента — только пересоздать:

```bash
cd mobile
npm run prebuild:owner:ios
cd ios && pod install && cd ..
npm run verify:ios:owner
open ios/*.xcworkspace
```

Скрипт `verify:ios:owner` должен вывести **✓ Bundle ID … ru.onthewater.owner**. Если там `ru.onthewater.client` — в Xcode снова соберётся клиент.

В Xcode: **Bundle ID** = `ru.onthewater.owner`, имя — «ONTHEWATER для владельцев».

После запуска в Metro-логе (терминал `npm run start:owner`) ищите строку:

`[ONTHEWATER] startup` → `variant: "owner"`, `applicationId: "ru.onthewater.owner"`.

Если `applicationId` = `ru.onthewater.client` — на симуляторе установлен **другой** билд; удалите приложение ONTHEWATER с экрана и Run снова.

### Debug в симуляторе (кнопка Run в Xcode)

Нужен **Metro** с вариантом owner:

**Терминал 1:**

```bash
cd mobile
npm run start:owner
```

**Терминал 2** (или Xcode): схема **Debug**, затем Run (⌘R).

Проще одной командой (Metro + сборка + установка):

```bash
cd mobile
npm run ios:owner
```

### Release / Archive в Xcode

Схема **Release** без Metro **не подхватит** JS, если бандл не собран. Варианты:

- **EAS (рекомендуется):** `npx eas-cli build --platform ios --profile production-owner`
- **Локально:** `npm run ios:owner` с конфигурацией Release, либо перед Archive:

```bash
cd mobile
npx cross-env EXPO_PUBLIC_APP_VARIANT=owner npx expo export:embed --platform ios
```

и затем Archive в Xcode.

---

## iOS: сборка приложения владельца для App Store (EAS)

### Bundle ID

| Вариант | `ios.bundleIdentifier` | Android `package` |
|--------|-------------------------|-------------------|
| Владелец | `ru.onthewater.owner` | `com.anonymous.onthewater.owner` |
| Клиент | `ru.onthewater.client` | `com.anonymous.onthewater` |

В [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list) создайте **App ID** с тем же Bundle ID, что для owner в `app.config.js`.

### App Store Connect (вручную)

1. [App Store Connect](https://appstoreconnect.apple.com/) → «Мои приложения» → **+** → новое приложение.
2. Укажите тот же **Bundle ID**, что зарегистрирован в Developer (например `ru.onthewater.owner`).
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

## react-native-yamap-plus: что важно для iOS

После перехода с `react-native-yamap` на **yamap-plus** (MapKit **4.30**) для Android достаточно `expo prebuild` и ключа в манифесте. Для **iOS** нужно три вещи сразу:

### 1. Нативный проект (prebuild на Mac или EAS Build)

Папка `ios/` генерируется при `expo prebuild --platform ios` (на Mac) или при **EAS Build**. Без этого CocoaPods не подтянет `YandexMapsMobile`.

Локально на Mac:

```bash
cd mobile
npx cross-env EXPO_PUBLIC_APP_VARIANT=client expo prebuild --platform ios
cd ios && pod install && cd ..
```

### 2. AppDelegate — в начале `didFinishLaunchingWithOptions`

В **Expo SDK 54** сначала вызывается `factory.startReactNative(...)`, и только потом `return super.application(...)`.  
Ключ MapKit нужно ставить **в начале** `application(_:didFinishLaunchingWithOptions:)`, **до** `startReactNative` — иначе на iOS тайлы не грузятся (серая сетка), а на Android может работать.

В **`AppDelegate`** должно быть:

```swift
import YandexMapsMobile

// в application(_:didFinishLaunchingWithOptions:)
YMKMapKit.setLocale("ru_RU")
YMKMapKit.setApiKey("ВАШ_КЛЮЧ")
YMKMapKit.sharedInstance().onStart()
```

Это делает плагин [`plugins/withYandexMapKitKey.js`](./plugins/withYandexMapKitKey.js) при prebuild (ключ из `extra.yandexMapkitApiKey` / `EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY`).

Если собираете в Xcode вручную — проверьте `ios/ONTHEWATER/AppDelegate.swift`: блок с комментарием `@boatrent/yandex-mapkit-init`. Ошибка `withLocale:` — неверный синтаксис; должно быть `YMKMapKit.setLocale("ru_RU")`.

### 3. JavaScript — `YamapInstance.init`

В корне приложения ([`App.client.js`](./App.client.js), [`src/shared/yamapInit.js`](./src/shared/yamapInit.js)):

```js
await YamapInstance.init(API_KEY);
```

Карта на экране поиска ждёт `ensureYamapInitialized()` перед монтированием `ClusteredYamap`.

**Expo Go** карты не поддерживает — только dev build / TestFlight / App Store.

---

## iOS TestFlight: серая сетка вместо карты (клиент)

Симптом: кластеры и логотип Яндекса есть, **тайлов нет** (серая сетка). На Android при том же ключе карта может работать.

### Типичные причины (по приоритету)

1. **Ключ в кабинете Яндекса без iOS Bundle ID** — для Android указан `com.anonymous.onthewater`, для iOS нужен отдельно **`ru.onthewater.client`** (ограничения платформ разные).
2. **Поздняя инициализация в AppDelegate** — `setApiKey` стоял перед `return super.application`, уже после `startReactNative` (исправлено в `withYandexMapKitKey.js` — блок переносится в начало `didFinishLaunchingWithOptions`).
3. **Нет `EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY` в EAS** — в TestFlight уходит запасной ключ из `app.config.js`; он может быть привязан только к Android.
4. **Старый IPA** — после правок AppDelegate нужен новый `eas build`, не повторная загрузка того же билда.

Чаще всего ключ MapKit **не разрешён для Bundle ID** реальной сборки или не попал в EAS.

| Вариант | iOS Bundle ID |
|--------|----------------|
| Клиент | `ru.onthewater.client` |
| Владелец | `ru.onthewater.owner` |

1. [developer.tech.yandex.ru](https://developer.tech.yandex.ru) → ключ → **MapKit Mobile SDK**.
2. Ограничение **iOS** = `ru.onthewater.client` (клиент) или `ru.onthewater.owner` (владелец). Подождать ~15 мин.
3. [Expo → Environment variables](https://expo.dev): `EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY` для профиля production.
4. **Новый** EAS-билд (не тот же IPA без пересборки после правок AppDelegate):

```bash
cd mobile
npx eas-cli build --platform ios --profile production-client
```
