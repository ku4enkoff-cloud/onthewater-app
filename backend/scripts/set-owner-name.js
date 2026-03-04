#!/usr/bin/env node
/**
 * Показать владельцев катеров и задать имя владельцу.
 * Запуск из папки backend:
 *   node scripts/set-owner-name.js                    — список владельцев
 *   node scripts/set-owner-name.js <id> "Имя Фамилия" — задать имя пользователю с id
 *
 * Пример: node scripts/set-owner-name.js 1 "Иван Петров"
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../src/db');

async function listOwners() {
    const { rows } = await pool.query(`
        SELECT u.id, u.email, u.name, u.first_name, u.last_name,
               (SELECT COUNT(*) FROM boats b WHERE b.owner_id = u.id) AS boats_count
        FROM users u
        WHERE u.role = 'owner' OR EXISTS (SELECT 1 FROM boats b WHERE b.owner_id = u.id)
        ORDER BY u.id
    `);
    console.log('Владельцы (id, email, name, first_name, last_name, катеров):');
    console.log('—'.repeat(60));
    for (const r of rows) {
        const name = [r.name, [r.first_name, r.last_name].filter(Boolean).join(' ')].find(Boolean) || '(не задано)';
        console.log(`id=${r.id}  email=${r.email || '(нет)'}  name="${r.name || ''}"  first_name="${r.first_name || ''}"  last_name="${r.last_name || ''}"  → отображается: ${name}  катеров: ${r.boats_count}`);
    }
}

async function setOwnerName(userId, displayName) {
    const id = parseInt(userId, 10);
    if (!id || !displayName || typeof displayName !== 'string') {
        console.log('Использование: node scripts/set-owner-name.js <id> "Имя Фамилия"');
        process.exit(1);
    }
    const name = displayName.trim();
    if (!name) {
        console.log('Укажите непустое имя.');
        process.exit(1);
    }
    const { rowCount } = await pool.query(
        'UPDATE users SET name = $1 WHERE id = $2',
        [name, id]
    );
    if (rowCount === 0) {
        console.log('Пользователь с id=' + id + ' не найден.');
        process.exit(1);
    }
    console.log('Обновлено: пользователь id=' + id + ', name="' + name + '"');
}

async function main() {
    const [, , userId, displayName] = process.argv;
    if (userId && displayName) {
        await setOwnerName(userId, displayName);
    } else {
        await listOwners();
    }
    await pool.end();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
