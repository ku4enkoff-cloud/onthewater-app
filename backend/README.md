# BoatRent Backend

API для аренды катеров и яхт (Express, PostgreSQL, JWT, Socket.IO).

## Проверка работы Backend на удалённом сервере

**С самого сервера** (по SSH):

```bash
curl -s http://localhost:3000/
curl -s http://localhost:3000/health
```

Ожидаемый ответ от `/`: `{"name":"BoatRent API","status":"ok","version":"1.0",...}`  
От `/health`: `{"ok":true}`

**С вашего компьютера** (подставьте IP или домен сервера):

```bash
curl -s http://IP_СЕРВЕРА:3000/
curl -s http://IP_СЕРВЕРА:3000/health
```

Если используете домен и Nginx (прокси на 80/443):

```bash
curl -s https://ваш-домен.com/
curl -s https://ваш-домен.com/health
```

**Проверка логина** (должен вернуть токен и данные пользователя):

```bash
curl -s -X POST http://IP_СЕРВЕРА:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@test.ru","password":"123"}'
```

Если порт 3000 закрыт фаерволом снаружи — проверка с вашего ПК будет работать только через открытый порт или через Nginx на 80/443.

---

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
- **Redis:** если сервер Redis с паролем — укажите `REDIS_URL=redis://:пароль@localhost:6379` (двоеточие перед паролем обязательно). Иначе будет ошибка `NOAUTH Authentication required`. Без Redis приложение тоже работает (один экземпляр API).
- S3 и Yookassa — по необходимости (без них загрузка файлов в `uploads/`)

### 5. Установка зависимостей и миграции

```bash
npm ci
node src/migrate.js
# опционально: node src/seed.js
```

### 6. Запуск через systemd (рекомендуется)

Узнайте путь к Node и пользователя, под которым лежит проект:

```bash
which node          # например /usr/bin/node или /home/user/.nvm/versions/node/v20.x/bin/node
whoami              # ваш пользователь, например ubuntu
pwd                 # из папки backend — полный путь, например /opt/boatrent/backend
```

Создайте юнит:

```bash
sudo nano /etc/systemd/system/boatrent-api.service
```

**Вариант A — без EnvironmentFile** (рекомендуется: .env подхватывает Node, systemd не ищет файл):

```ini
[Unit]
Description=BoatRent API
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/opt/onthewater-app/backend
ExecStart=/usr/bin/node -r dotenv/config src/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Замените:
- `User=` и `Group=` на вашего пользователя (`whoami`);
- `WorkingDirectory=` на **реальный** путь к папке `backend` (где лежат `package.json` и `.env`), например `/opt/onthewater-app/backend`;
- в `ExecStart=` — полный путь к `node` из `which node`, если нужен (при nvm — например `/home/ubuntu/.nvm/versions/node/v20.10.0/bin/node`).

Строку `EnvironmentFile=` **не используйте** — иначе при неверном пути будет ошибка «Failed to load environment files: No such file or directory».

**Вариант B — под www-data** (если нужен веб-сервер от имени www-data). Тогда выдайте права на папку backend:

```bash
sudo chown -R www-data:www-data /opt/boatrent/backend
```

И в юните укажите `User=www-data` и `Group=www-data`.

```bash
sudo systemctl daemon-reload
sudo systemctl enable boatrent-api
sudo systemctl start boatrent-api
sudo systemctl status boatrent-api
```

Логи: `journalctl -u boatrent-api -f`

#### Если сервис не стартует: «unavailable resources or another system error»

1. **Сразу посмотрите точную причину** (в конце вывода будет строка с ошибкой):
   ```bash
   journalctl -xeu boatrent-api.service --no-pager
   ```

2. **Вариант без EnvironmentFile** — если ошибка связана с чтением `.env`, используйте юнит, где переменные подхватывает сам Node (через `dotenv` из рабочей папки). Уберите строку `EnvironmentFile=...` и в `ExecStart` вызовите node с загрузкой конфига:
   ```ini
   [Service]
   Type=simple
   User=ubuntu
   Group=ubuntu
   WorkingDirectory=/opt/onthewater-app/backend
   ExecStart=/usr/bin/node -r dotenv/config src/index.js
   Restart=on-failure
   RestartSec=5
   ```
   Подставьте свой `User`, `Group` и **реальный** `WorkingDirectory` (путь, где лежит `package.json` и `.env`). После правки: `sudo systemctl daemon-reload` и `sudo systemctl start boatrent-api`.

3. **Частые причины:**
   - **Неверный WorkingDirectory** — путь должен существовать. Проверьте: `ls /opt/onthewater-app/backend/src/index.js` (или ваш путь). Если репозиторий клонирован в `/opt/onthewater-app`, то и в юните должно быть `WorkingDirectory=/opt/onthewater-app/backend`.
   - **User/Group** — укажите пользователя, от которого делали `git clone` и `npm ci` (команда `whoami`). Папка backend должна быть ему доступна.
   - **Node не найден** — в `ExecStart` укажите полный путь: `which node`. При установке через nvm используйте полный путь к `node`, например `/home/ubuntu/.nvm/versions/node/v20.x.x/bin/node`.
   - **Порт 3000 занят** — проверьте: `sudo ss -tlnp | grep 3000`. Запуск вручную из папки backend: `node src/index.js` — если так работает, проблема в путях или пользователе в systemd.

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
