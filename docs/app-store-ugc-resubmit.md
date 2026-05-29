# Повторная отправка в App Store (Guideline 1.2 — UGC)

## 1. Backend

```bash
cd backend
node src/migrate.js
# Задать ADMIN_REPORT_EMAIL в .env
# Деплой API на production
```

## 2. Админка

- Раздел **Жалобы UGC** — обработка открытых жалоб в течение 24 ч.
- **Документы** → «Условия обслуживания» — при необходимости дополнить текст (миграция добавляет базовый UGC-блок, если body пустой).

## 3. Сборки

```bash
cd mobile
# Клиент iOS
eas build --profile production-client --platform ios
# Владелец iOS (тот же чат/модерация)
eas build --profile production-owner --platform ios
```

## 4. Screen recording (физическое устройство)

Записать 3 сцены для **App Review Information → Notes**:

1. **Регистрация** — обязательный чекбокс EULA, открытие «Условий обслуживания».
2. **Чат** — long-press на чужое сообщение → «Пожаловаться» → отправка.
3. **Чат** — меню ⋯ → «Заблокировать» → чат исчезает из списка.

## 5. Текст ответа Apple (English, кратко)

- Users must accept Terms of Service at registration and on login (modal for legacy accounts).
- In-app report and block; block auto-notifies moderators via email and hides content immediately.
- Message content filtered server-side; admin panel processes reports within 24 hours.
- Reviews are pre-moderated in the admin panel.
