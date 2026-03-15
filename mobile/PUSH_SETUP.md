# Настройка push-уведомлений (Android)

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
   - для владельцев: `com.anonymous.onthewater.owner`  
   (можно добавить оба приложения в один проект).
6. Скачайте **google-services.json** и положите его в папку `mobile/` (рядом с `app.config.js`).
7. Переименовывать не нужно — в `app.config.js` уже указан путь `./google-services.json`.

Плагин `withGoogleServices` подключит в Android-сборку инициализацию Firebase (без этого будет ошибка «Default FirebaseApp is not initialized»).

**Файл должен оказаться в `android/app/google-services.json`.** При запуске `npx expo prebuild` Expo копирует его из `mobile/`. Если вы собираете без prebuild или папка `android/` уже была — скопируйте вручную:

```bash
# из корня репозитория (PowerShell)
Copy-Item mobile\google-services.json mobile\android\app\google-services.json -Force
```

### 2. Пересборка APK

После того как `google-services.json` лежит в `mobile/` (и при сборке — в `android/app/`), пересоберите приложение:

```bash
cd mobile
npx expo prebuild --clean
npm run build:client:release
```

Если папка `android/` уже настроена и вы не хотите делать prebuild — достаточно скопировать файл в `android/app/` (см. выше) и выполнить только `npm run build:client:release`.

Установите новый APK на телефон и снова проверьте тестовое уведомление.

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
   JSON ключ должен быть из **того же** Firebase-проекта, из которого взят `google-services.json` в приложении. Package name `com.anonymous.onthewater` должен быть добавлен в этом проекте в «Your apps».

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

**Итог:** нужны (1) `google-services.json` в приложении и пересборка APK, (2) Expo projectId в конфиге, (3) загрузка FCM сервисного ключа в EAS — тогда регистрация и тестовый push заработают.
