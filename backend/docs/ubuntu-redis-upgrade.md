# Обновление Redis до 6.2+ на Ubuntu

Если в логах появляется предупреждение:
```
It is highly recommended to use a minimum Redis version of 6.2.0
Current: 6.0.16
```

Подключение к Redis при этом работает. Обновление нужно только чтобы убрать предупреждение и использовать новые возможности Redis.

## Вариант 1: Официальный репозиторий Redis (рекомендуется)

```bash
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt update
sudo apt install redis -y
redis-server --version
```

Перезапустите Redis и приложение:

```bash
sudo systemctl restart redis-server
sudo systemctl restart boatrent-api
```

## Вариант 2: Оставить как есть

Redis 6.0.16 для одного экземпляра API и Socket.IO достаточен. Предупреждение можно игнорировать — работа приложения не нарушается.
