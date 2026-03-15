# Настройка push-уведомлений (Android)

В APK-сборке для получения push-токена нужны:
1. **Firebase** — файл `google-services.json` (FCM).
2. **Expo projectId** — для `getExpoPushTokenAsync()` в development build (не Expo Go).

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

### 3. Отправка уведомлений

Отправка идёт через **Expo Push API** (в бэкенде уже настроено). Отдельный FCM Server Key в бэкенде не нужен — Expo принимает Expo Push Token и сам стучится в FCM.

---

**Итог:** без `google-services.json` в `mobile/` приложение не может получить push-токен на Android. После добавления файла и пересборки APK регистрация и тестовый push должны заработать.
