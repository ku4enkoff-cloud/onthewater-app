require('dotenv').config();
const { pool } = require('./db');

async function migrate_chat() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('Создание таблицы messages...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
        text TEXT NOT NULL,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

        await client.query('COMMIT');
        console.log('Миграция чата успешно завершена!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка при миграции чата:', error);
    } finally {
        client.release();
        pool.end();
    }
}

migrate_chat();
