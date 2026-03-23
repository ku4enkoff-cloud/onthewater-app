# Настройка push-уведомлений (Android)

Работает для **клиентского** и **owner** приложений (одни и те же шаги).

В APK-сборке для push нужны:
1. **Firebase** — файл `google-services.json` в приложении (получение токена на устройстве).
2. **Expo projectId** — для `getExpoPushTokenAsync()` в development build (не Expo Go).
3. **FCM ключ в EAS** — сервисный ключ Google (JSON) загрузить в проект на expo.dev, иначе при отправке будет *InvalidCredentials: Unable to retrieve the FCM server key*.

Без этого кнопка «Отправить тестовое уведомление» выдаёт ошибку.

## Шаги

### 0. Expo projectId (обязательно для push)

В сборке без Expo Go нужен **Expo Project ID** (UUID). Иначе будет ошибка: *No 'projectId' found*.

**Как получить:**
- Зайдите на [expo.dev](https://expo.dev), войдите в аккаунт.
- Создайте проект или откройте существующий → в настройках проекта скопируйте **Project ID** (формат UUID).
- Либо в папке `mobile` выполните: `npx eas init` — проект привяжется к EAS, ID попадёт в конфиг.

**Как задать (один из вариантов):**
- В `app.config.js` в `extra.eas.projectId` подставьте свой UUID, **или**
- Задайте переменную окружения при сборке/запуске:  
  `EXPO_PUBLIC_EAS_PROJECT_ID=ваш-uuid`

После изменения конфига пересоберите приложение.

### 1. Firebase-проект

1. Зайдите в [Firebase Console](https://console.firebase.google.com/).
2. Создайте проект или выберите существующий.
3. В проекте: **Project settings** (шестерёнка) → вкладка **General** → внизу **Your apps**.
4. Нажмите **Add app** → выберите **Android**.
5. **Android package name:** укажите:
   - для клиента: `com.anonymous.onthewater`
   - для владельцев (owner): `com.anonymous.onthewater.owner`  
   Добавьте оба приложения в один Firebase-проект (Add app → Android для каждого).
6. Скачайте **google-services.json** для каждого приложения и положите в `mobile/`:
   - **Клиент** — переименуйте в `google-services-client.json`
   - **Owner** — переименуйте в `google-services-owner.json`  
   При сборке будет использоваться нужный файл автоматически.  
   Альтернатива: один объединённый файл `google-services.json` (см. раздел ниже).

#### Два отдельных файла (рекомендуется)

Скачайте из Firebase два файла и сохраните в `mobile/`:
- для клиента → `google-services-client.json`
- для owner → `google-services-owner.json`

При сборке `app.config.js` автоматически выберет нужный файл по `EXPO_PUBLIC_APP_VARIANT`. Никакого объединения не требуется.

#### Один объединённый файл (альтернатива)

Если хотите один файл `google-services.json`:
1. Скачайте оба файла из Firebase.
2. Откройте в редакторе. В массиве `"client"` объедините записи — добавьте второй объект из другого файла в массив.
3. Блок `"project_info"` оставьте один (одинаков в обоих).
4. Сохраните как `mobile/google-services.json`.

Приоритет: если есть `google-services-client.json` / `google-services-owner.json` — используются они; иначе — `google-services.json`.

---

Плагин `withGoogleServices` подключит в Android-сборку инициализацию Firebase (без этого будет ошибка «Default FirebaseApp is not initialized»).

**Файл должен оказаться в `android/app/google-services.json`.** При запуске `npx expo prebuild` Expo копирует нужный файл из `mobile/`. Если собираете без prebuild — скопируйте вручную нужный файл:

```bash
# Клиент (PowerShell)
Copy-Item mobile\google-services-client.json mobile\android\app\google-services.json -Force

# Owner (PowerShell)
Copy-Item mobile\google-services-owner.json mobile\android\app\google-services.json -Force
```

### 2. Пересборка APK

После того как `google-services.json` лежит в `mobile/` (и при сборке — в `android/app/`), пересоберите приложение:

**Клиентское приложение:**
```bash
cd mobile
npx cross-env EXPO_PUBLIC_APP_VARIANT=client expo prebuild --platform android --clean
npm run build:client:release
```

**Owner-приложение (для владельцев):**
```bash
cd mobile
npx cross-env EXPO_PUBLIC_APP_VARIANT=owner expo prebuild --platform android --clean
npm run build:owner:release
```

Если папка `android/` уже настроена и вы не хотите делать prebuild — скопируйте `google-services.json` в `android/app/` и выполните только `npm run build:client:release` или `npm run build:owner:release`.

Установите APK на телефон и проверьте тестовое уведомление (в Owner: Профиль → Уведомления).

### 3. FCM-ключ для Expo (обязательно для отправки на Android)

Иначе в логах сервера будет: *InvalidCredentials: Unable to retrieve the FCM server key*.

Expo отправляет push на Android через FCM. Ему нужен **ключ сервисного аккаунта Google** (FCM v1), загруженный в проект на Expo.

**Шаг 1 — создать ключ в Firebase**

1. [Firebase Console](https://console.firebase.google.com/) → ваш проект.
2. **Project settings** (шестерёнка) → вкладка **Service accounts**.
3. Нажмите **Generate New Private Key** → **Generate Key**. Скачается JSON-файл (не путать с `google-services.json` — это другой файл).
4. Сохраните его в безопасном месте и **не коммитьте в git** (добавьте в `.gitignore`).

**Шаг 2 — загрузить ключ в EAS**

- **Через сайт:** [expo.dev](https://expo.dev) → ваш аккаунт → проект → **Credentials** → **Android** → **Google Service Account Key (FCM V1)** → загрузить JSON-файл.
- **Через CLI:** в папке `mobile` выполните:
  ```bash
  npx eas credentials
  ```
  Выберите **Android** → **production** (или нужный профиль) → **Google Service Account Key** → **Upload a new service account key** и укажите путь к скачанному JSON.

После загрузки ключа повторная сборка APK не нужна — можно сразу снова нажать «Отправить тестовое уведомление».

**Если ошибка InvalidCredentials остаётся — проверьте:**

1. **Куда загружен ключ**  
   Нужен раздел именно **«Google Service Account Key (FCM V1)»** / Push Notifications, **не** «Android Keystore» (Keystore — для подписи APK, к push не относится). В EAS: Credentials → Android → найдите блок про **FCM** / Push Notifications и загрузите туда JSON сервисного аккаунта.

2. **Тот же проект Firebase**  
   JSON ключ должен быть из **того же** Firebase-проекта, из которого взят `google-services.json`. Оба приложения (`com.anonymous.onthewater` и `com.anonymous.onthewater.owner`) должны быть добавлены в «Your apps».

3. **Включён ли FCM API**  
   [Google Cloud Console](https://console.cloud.google.com/) → выберите проект Firebase → **APIs & Services** → **Enabled APIs** → найдите **Firebase Cloud Messaging API** (или **Cloud Messaging**) и включите, если выключен.

4. **Загрузить ключ через CLI**  
   Иногда форма на сайте не привязывает ключ к push. Попробуйте в папке `mobile`:
   ```bash
   npx eas credentials
   ```
   Выберите **Android** → **production** → **Set up a Google Service Account Key for Push Notifications (FCM V1)** → **Upload a new service account key** и укажите путь к JSON. Так ключ точно попадёт в настройки push.

5. **Права сервисного аккаунта**  
   Если ключ создан в Firebase Console (Project settings → Service accounts → Generate New Private Key), прав обычно достаточно. Если используете существующий аккаунт из Google Cloud IAM, ему нужна роль **Firebase Cloud Messaging API Admin** (или доступ к FCM).

6. **Новый push-токен**  
   После первой успешной загрузки FCM-ключа иногда нужно заново получить токен: в приложении выключите и снова включите push в настройках уведомлений и нажмите «Отправить тестовое уведомление» ещё раз (токен обновится при регистрации).

### 4. Отправка уведомлений

Отправка идёт через **Expo Push API** (в бэкенде уже настроено). Expo по Expo Push Token сам обращается к FCM, используя загруженный сервисный ключ.

---

## Owner-приложение

Owner и клиент используют **один** Expo projectId и **один** FCM-ключ в EAS. Разница только в:

1. **Firebase** — добавьте Android-приложение с package `com.anonymous.onthewater.owner`, скачайте конфиг и сохраните как `google-services-owner.json` в `mobile/`.
2. **Сборка** — используйте `npm run build:owner:release` и prebuild с `EXPO_PUBLIC_APP_VARIANT=owner`.

В Owner push настраивается: **Профиль** → **Уведомления** → включите переключатель «Push-уведомления» и при необходимости «Отправить тестовое уведомление».

---

**Итог:** нужны (1) `google-services.json` (с обоими package) и пересборка APK, (2) Expo projectId в конфиге, (3) загрузка FCM сервисного ключа в EAS — тогда push заработает и в клиенте, и в owner.
