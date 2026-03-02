# BoatRent Backend

API для аренды катеров и яхт (Express, PostgreSQL, JWT, Socket.IO).

## Упаковка в Git

1. **Не коммитить:**
   - `node_modules/` (уже в .gitignore)
   - `.env` (секреты; в .gitignore)
   - `uploads/` (загруженные файлы; в .gitignore)
   - `*.log`

2. **Коммитить:**
   - весь исходный код `src/`
   - `package.json`, `package-lock.json`
   - `.env.example` (без паролей)
   - `README.md`

3. **Первый раз добавить backend в репозиторий (из корня проекта):**
   ```bash
   git add backend/
   git status   # убедиться, что .env и node_modules не попали
   git commit -m "Backend: API для аренды катеров"
   git push
   ```

---

## Развёртывание на Ubuntu

### 1. Подготовка сервера

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm postgresql redis-server
```

Если Node.js старый, установите LTS через NodeSource:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. PostgreSQL

```bash
sudo -u postgres psql -c "CREATE USER boatrent WITH PASSWORD 'ваш_надёжный_пароль';"
sudo -u postgres psql -c "CREATE DATABASE boatrent OWNER boatrent;"
```

### 3. Клонирование и настройка

```bash
cd /opt   # или домашняя папка пользователя
sudo git clone https://github.com/ВАШ_ЛОГИН/boatrent.git
sudo chown -R $USER:$USER boatrent
cd boatrent/backend
```

### 4. Переменные окружения

```bash
cp .env.example .env
nano .env
```

Заполните в `.env`:
- `JWT_SECRET` — длинная случайная строка
- `DATABASE_URL=postgresql://boatrent:ваш_пароль@localhost:5432/boatrent`
- `PORT=3000` (или другой)
- Redis можно не трогать, если один экземпляр API
- S3 и Yookassa — по необходимости (без них загрузка файлов в `uploads/`)

### 5. Установка зависимостей и миграции

```bash
npm ci
node src/migrate.js
# опционально: node src/seed.js
```

### 6. Запуск через systemd (рекомендуется)

Создайте юнит:

```bash
sudo nano /etc/systemd/system/boatrent-api.service
```

Содержимое:

```ini
[Unit]
Description=BoatRent API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/boatrent/backend
EnvironmentFile=/opt/boatrent/backend/.env
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Подставьте свой путь к проекту и пользователя. Загрузить `.env` можно так: `EnvironmentFile=/opt/boatrent/backend/.env` (в .env не должно быть пробелов вокруг `=`).

```bash
sudo systemctl daemon-reload
sudo systemctl enable boatrent-api
sudo systemctl start boatrent-api
sudo systemctl status boatrent-api
```

Логи: `journalctl -u boatrent-api -f`

### 7. Nginx как обратный прокси (опционально)

Чтобы отдавать API по 80/443 и подмешивать статику `uploads/`:

```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/boatrent-api
```

Пример конфига:

```nginx
server {
    listen 80;
    server_name your-domain.com;

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

    location /uploads/ {
        alias /opt/boatrent/backend/uploads/;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/boatrent-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

В мобильном приложении тогда укажите `EXPO_PUBLIC_API_URL=https://your-domain.com` (или `http://IP_СЕРВЕРА` без Nginx).

### 8. Обновление с Git

```bash
cd /opt/boatrent
git pull
cd backend
npm ci
node src/migrate.js
sudo systemctl restart boatrent-api
```

---

## Локальный запуск

```bash
cp .env.example .env
# отредактировать .env (минимум JWT_SECRET и DATABASE_URL)
npm install
node src/migrate.js
npm start
```

API: http://localhost:3000
