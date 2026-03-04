#!/usr/bin/env node
/**
 * Пересчёт рейтинга и количества отзывов у всех катеров.
 * Запуск на сервере: cd /opt/onthewater-app/backend && node scripts/recalc-boat-ratings.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../src/db');

async function run() {
    const client = await pool.connect();
    try {
        const { rowCount } = await client.query(`
            UPDATE boats b
            SET
                rating = COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 2) FROM reviews r WHERE r.boat_id = b.id AND r.status = 'approved' AND COALESCE(r.spam, false) = false), 0),
                reviews_count = COALESCE((SELECT COUNT(*)::int FROM reviews r WHERE r.boat_id = b.id AND r.status = 'approved' AND COALESCE(r.spam, false) = false), 0)
        `);
        console.log('Обновлено катеров:', rowCount);
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
