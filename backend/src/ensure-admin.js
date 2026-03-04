/**
 * Создаёт или обновляет админ-аккаунт admin@test.ru с паролем 123.
 * Запуск на сервере: node src/ensure-admin.js
 * (из папки backend: node src/ensure-admin.js)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

const ADMIN_EMAIL = 'admin@test.ru';
const ADMIN_PASSWORD = '123';

async function ensureAdmin() {
    const client = await pool.connect();
    try {
        const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
        const { rows: existing } = await client.query(
            'SELECT id, role FROM users WHERE email = $1',
            [ADMIN_EMAIL]
        );
        if (existing.length > 0) {
            await client.query(
                'UPDATE users SET password_hash = $1, role = $2, name = COALESCE(NULLIF(TRIM(name), \'\'), $3) WHERE email = $4',
                [hash, 'admin', 'Администратор', ADMIN_EMAIL]
            );
            console.log('Пароль и роль администратора обновлены: ' + ADMIN_EMAIL + ' / ' + ADMIN_PASSWORD);
        } else {
            await client.query(
                `INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
                [ADMIN_EMAIL, 'Администратор', hash]
            );
            console.log('Создан администратор: ' + ADMIN_EMAIL + ' / ' + ADMIN_PASSWORD);
        }
    } catch (err) {
        console.error('Ошибка ensure-admin:', err.message);
        process.exitCode = 1;
    } finally {
        client.release();
        pool.end();
    }
}

ensureAdmin();
