#!/usr/bin/env node
/**
 * Добавляет колонки status и spam в таблицу reviews, если их нет.
 * Запуск на сервере: cd /opt/onthewater-app/backend && node scripts/add-reviews-columns.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../src/db');

async function run() {
    const client = await pool.connect();
    try {
        await client.query(`
            ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
        `);
        console.log('Column reviews.status: OK');
        await client.query(`
            ALTER TABLE reviews ADD COLUMN IF NOT EXISTS spam BOOLEAN DEFAULT FALSE
        `);
        console.log('Column reviews.spam: OK');
        await client.query(`UPDATE reviews SET status = 'approved' WHERE status IS NULL`);
        console.log('Migration done.');
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
