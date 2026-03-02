# Установка Node.js 20 на Ubuntu (при конфликте с libnode-dev)

Если при установке NodeSource появляется ошибка:
```
trying to overwrite '/usr/include/node/common.gypi', which is also in package libnode-dev
```

Выполните по шагам.

## 1. Удалить старый Node.js и libnode-dev

```bash
sudo apt remove --purge nodejs libnode-dev libnode72 -y
sudo apt remove --purge npm -y
sudo apt autoremove -y
```

Если какие-то пакеты не найдены — не страшно, продолжайте.

## 2. Очистить кэш apt (опционально, но полезно)

```bash
sudo apt clean
sudo apt update
```

## 3. Добавить репозиторий NodeSource и установить Node 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 4. Проверить

```bash
node -v   # должно быть v20.x.x
npm -v
```

## Альтернатива: Node через nvm (без конфликтов с системными пакетами)

Если не хотите трогать системные пакеты:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc   # или перезайти в терминал
nvm install 20
nvm use 20
node -v
```

Тогда для запуска backend используйте полный путь к node или добавьте `nvm use 20` в скрипт запуска.
