require('dotenv').config();
const { pool } = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Начинаю миграцию базы данных...');
    await client.query('BEGIN');

    // 2. Создание таблицы пользователей
    console.log('Создание таблицы users...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        avatar VARCHAR(255),
        role VARCHAR(20) DEFAULT 'client' CHECK (role IN ('client', 'owner', 'admin')),
        city VARCHAR(100),
        about TEXT,
        gims_number VARCHAR(100), -- Номер прав ГИМС
        rating NUMERIC(3, 2) DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Создание таблицы типов судов (динамическое управление)
    console.log('Создание таблицы boat_types...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS boat_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    // Добавляем базовые типы судов, если таблица пуста
    await client.query(`
      INSERT INTO boat_types (name, slug)
      VALUES 
        ('Катер', 'motorboat'),
        ('Яхта', 'yacht'),
        ('Гидроцикл', 'jetski'),
        ('Парусная яхта', 'sailboat'),
        ('Катамаран', 'catamaran'),
        ('Буксировщик', 'wakeboat')
      ON CONFLICT (slug) DO NOTHING;
    `);

    // 4. Создание таблицы катеров
    console.log('Создание таблицы boats...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS boats (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type_id INTEGER REFERENCES boat_types(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        year INTEGER,
        length_m NUMERIC(5, 2),
        capacity INTEGER NOT NULL,
        location_city VARCHAR(100) NOT NULL,
        location_address VARCHAR(255) NOT NULL,
        lat FLOAT, -- Обычные координаты вместо PostGIS для MVP
        lng FLOAT,
        price_per_hour NUMERIC(10, 2) NOT NULL,
        price_per_day NUMERIC(10, 2),
        captain_included BOOLEAN DEFAULT false,
        has_captain_option BOOLEAN DEFAULT false,
        amenities JSONB DEFAULT '[]',
        rules TEXT,
        photos JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'moderation' CHECK (status IN ('active', 'paused', 'moderation')),
        rating NUMERIC(3, 2) DEFAULT 0.00,
        reviews_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Создание таблицы бронирований
    console.log('Создание таблицы bookings...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        boat_id INTEGER REFERENCES boats(id) ON DELETE CASCADE,
        client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date_start TIMESTAMP WITH TIME ZONE NOT NULL,
        date_end TIMESTAMP WITH TIME ZONE NOT NULL,
        hours NUMERIC(5, 2) NOT NULL,
        total_price NUMERIC(10, 2) NOT NULL,
        deposit_amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'pending', 'confirmed', 'active', 'completed', 'cancelled')),
        payment_idempotency_key UUID UNIQUE, -- Для интеграции с ЮKassa
        captain_requested BOOLEAN DEFAULT false,
        guests_count INTEGER NOT NULL,
        message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Создание таблицы отзывов
    console.log('Создание таблицы reviews...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        target_id INTEGER NOT NULL, -- ID катера или пользователя
        target_type VARCHAR(20) CHECK (target_type IN ('boat', 'owner', 'client')),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
        text TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(booking_id, author_id)
      );
    `);

    // 7. Создание таблицы избранного
    console.log('Создание таблицы favorites...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        boat_id INTEGER REFERENCES boats(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, boat_id)
      );
    `);

    await client.query('COMMIT');
    console.log('Миграция успешно завершена!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка при миграции:', error);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
