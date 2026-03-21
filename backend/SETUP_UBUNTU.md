# Инструкция по настройке бэкенда BoatRent на Ubuntu

Данная инструкция описывает развёртывание бэкенда приложения BoatRent на сервере Ubuntu.

---

## 1. Требования

- Ubuntu 22.04 LTS (или новее)
- Доступ по SSH к серверу
- Доменное имя (например, `api.onthewater.ru`) и SSL-сертификат

---

## 2. Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 3. Установка Node.js

Рекомендуется использовать Node.js 20 LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # должно быть v20.x.x
npm -v
```

---

## 4. Установка PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 4.1 Создание базы данных и пользователя

```bash
sudo -u postgres psql
```

В консоли PostgreSQL:

```sql
CREATE USER boatrent WITH PASSWORD 'ваш_надёжный_пароль';
CREATE DATABASE boatrent OWNER boatrent;
GRANT ALL PRIVILEGES ON DATABASE boatrent TO boatrent;
\c boatrent
GRANT ALL ON SCHEMA public TO boatrent;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO boatrent;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO boatrent;
\q
```

Проверка подключения:

```bash
psql -h localhost -U boatrent -d boatrent -c "SELECT 1;"
```

---

## 5. Установка Redis (опционально, но рекомендуется)

Redis нужен для Socket.IO при нескольких экземплярах приложения. Без Redis чаты работают только на одном процессе.

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping   # ответ: PONG
```

---

## 6. Развёртывание приложения

### 6.1 Загрузка кода

```bash
# Если используете git:
cd /var/www   # или другой каталог
sudo mkdir -p boatrent
sudo chown $USER:$USER boatrent
cd boatrent
git clone <url_репозитория> .
# или скопируйте файлы через scp/sftp
```

### 6.2 Установка зависимостей

```bash
cd backend
npm ci --omit=dev
```

### 6.3 Файл окружения .env

```bash
cp .env.example .env
nano .env
```

Заполните **обязательные** переменные:

| Переменная | Описание | Пример |
|------------|----------|--------|
| `PORT` | Порт приложения | `3000` |
| `JWT_SECRET` | Секретный ключ для JWT (сгенерируйте случайную строку) | `длинная_случайная_строка_32+_символов` |
| `APP_URL` | Полный URL API (для ссылок в письмах) | `https://api.onthewater.ru` |
| `DATABASE_URL` | Строка подключения к PostgreSQL | `postgresql://boatrent:пароль@localhost:5432/boatrent` |

**Опционально:**

| Переменная | Описание |
|------------|----------|
| `REDIS_URL` | Redis (по умолчанию `redis://localhost:6379`) |
| `ALLOWED_ORIGINS` | CORS: допустимые источники через запятую |
| `YANDEX_S3_*` | Yandex Object Storage для загрузки фото |
| `YOOKASSA_*` | ЮKassa для приёма платежей |
| `SMTP_*` | SMTP для подтверждения email |

Сгенерировать JWT_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 7. Миграция базы данных

```bash
cd backend
npm run db:migrate
```

При необходимости создать администратора:

```bash
npm run ensure-admin
```

---

## 8. Запуск через PM2 (рекомендуется)

PM2 позволяет держать приложение запущенным и перезапускать его при падении.

```bash
sudo npm install -g pm2
cd /var/www/boatrent/backend
pm2 start src/index.js --name boatrent-api
pm2 save
pm2 startup   # выполните команду, которую выведет pm2
```

Полезные команды PM2:

```bash
pm2 status
pm2 logs boatrent-api
pm2 restart boatrent-api
```

---

## 9. Nginx как обратный прокси

### 9.1 Установка Nginx

```bash
sudo apt install -y nginx
```

### 9.2 Конфигурация

```bash
sudo nano /etc/nginx/sites-available/boatrent
```

Пример конфига для API:

```nginx
server {
    listen 80;
    server_name api.onthewater.ru;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Активация:

```bash
sudo ln -s /etc/nginx/sites-available/boatrent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9.3 SSL с Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.onthewater.ru
```

---

## 10. Файрвол

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 11. Проверка

```bash
# Локально
curl http://localhost:3000/health

# Через Nginx
curl https://api.onthewater.ru/health
```

Ответ: `{"ok":true}`

---

## 12. Обновление приложения

```bash
cd /var/www/boatrent
git pull
cd backend
npm ci --omit=dev
npm run db:migrate
pm2 restart boatrent-api
```

---

## 13. Логи

```bash
pm2 logs boatrent-api
# или
journalctl -u nginx -f
```

---

## 14. Возможные проблемы

### База данных не подключается

- Проверьте `DATABASE_URL` в `.env`
- Убедитесь, что PostgreSQL слушает `localhost` (в `pg_hba.conf` разрешены локальные подключения)

### Redis connection refused

- Redis опционален. Без него Socket.IO работает в режиме одного экземпляра
- Если нужен Redis: `sudo systemctl status redis-server`

### 502 Bad Gateway от Nginx

- Убедитесь, что приложение запущено: `pm2 status`
- Проверьте порт в `proxy_pass` (должен совпадать с `PORT` в `.env`)

### CORS ошибки

- Задайте `ALLOWED_ORIGINS` в `.env`, например:  
  `ALLOWED_ORIGINS=https://onthewater.ru,https://admin.onthewater.ru,capacitor://localhost`

---

## 15. Минимальная конфигурация .env

```env
PORT=3000
JWT_SECRET=ваш_длинный_секретный_ключ_32_символа
APP_URL=https://api.onthewater.ru
DATABASE_URL=postgresql://boatrent:пароль@localhost:5432/boatrent
```

Остальные параметры можно добавить позже по мере необходимости.
