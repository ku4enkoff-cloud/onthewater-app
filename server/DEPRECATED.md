# Устарело

Используйте папку **backend/** вместо **server/**.

Backend использует:
- JWT вместо токенов в БД
- bcrypt для паролей
- Совместимый API с mobile и admin
- Модульную структуру
- Опциональные Redis и S3

## Миграция

1. Создайте БД для backend (отдельную или переиспользуйте).
2. `cd backend && npm run db:migrate && npm run db:seed`
3. Запустите backend: `cd backend && npm start`
4. Обновите mobile `.env`: `EXPO_PUBLIC_API_URL=http://192.168.x.x:3000`
5. Обновите admin `VITE_API_URL` если нужно.
