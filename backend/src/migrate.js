require('dotenv').config();
const { pool } = require('./db');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Миграция БД (схема server-compatible)...');

        // Совместимость: если users создан server (колонка password), добавляем password_hash
        await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`).catch(() => {});
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`).catch(() => {});
        const { rows: cols } = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name IN ('password', 'password_hash')
        `);
        const hasPass = cols.some(r => r.column_name === 'password');
        const hasHash = cols.some(r => r.column_name === 'password_hash');
        if (hasPass && hasHash) {
            await client.query(`
                UPDATE users SET password_hash = crypt(password, gen_salt('bf'))
                WHERE password_hash IS NULL AND password IS NOT NULL
            `).catch(() => {});
        }
        if (hasPass && !hasHash) {
            await client.query(`
                ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
            `).catch(() => {});
            await client.query(`
                UPDATE users SET password_hash = crypt(password, gen_salt('bf')) WHERE password IS NOT NULL
            `).catch(() => {});
        }

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255),
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'client',
                phone TEXT DEFAULT '',
                birthdate TEXT,
                about TEXT,
                address_line TEXT,
                address_city TEXT,
                address_street TEXT,
                address_zip TEXT,
                address_country TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS boats (
                id SERIAL PRIMARY KEY,
                owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                owner_name VARCHAR(255),
                title VARCHAR(500),
                description TEXT DEFAULT '',
                type_id VARCHAR(50),
                type_name VARCHAR(100),
                manufacturer VARCHAR(255) DEFAULT '',
                model VARCHAR(255) DEFAULT '',
                year VARCHAR(10) DEFAULT '',
                length_m VARCHAR(20) DEFAULT '',
                capacity VARCHAR(20) DEFAULT '0',
                location_country VARCHAR(255) DEFAULT '',
                location_region VARCHAR(255) DEFAULT '',
                location_city VARCHAR(255) DEFAULT '',
                location_address TEXT DEFAULT '',
                location_yacht_club TEXT DEFAULT '',
                lat DOUBLE PRECISION,
                lng DOUBLE PRECISION,
                price_per_hour VARCHAR(50) DEFAULT '0',
                price_per_day VARCHAR(50) DEFAULT '',
                captain_included BOOLEAN DEFAULT FALSE,
                has_captain_option BOOLEAN DEFAULT FALSE,
                rules TEXT DEFAULT '',
                cancellation_policy TEXT DEFAULT '',
                photos JSONB DEFAULT '[]'::jsonb,
                amenities JSONB DEFAULT '[]'::jsonb,
                schedule_work_days JSONB,
                schedule_weekday_hours JSONB,
                schedule_weekend_hours JSONB,
                schedule_min_duration INT DEFAULT 60,
                price_tiers JSONB DEFAULT '[]'::jsonb,
                price_weekend VARCHAR(50) DEFAULT '',
                video_uris JSONB DEFAULT '[]'::jsonb,
                instant_booking BOOLEAN DEFAULT FALSE,
                status VARCHAR(50) DEFAULT 'moderation',
                rating DOUBLE PRECISION DEFAULT 0,
                reviews_count INT DEFAULT 0,
                bookings_count INT DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                boat_id INT NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
                user_id INT REFERENCES users(id) ON DELETE SET NULL,
                user_name VARCHAR(255),
                rating INT NOT NULL,
                text TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                owner_id INT NOT NULL,
                boat_id INT NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
                boat_title VARCHAR(500),
                boat_photo TEXT,
                start_at TIMESTAMPTZ,
                hours INT DEFAULT 3,
                passengers INT DEFAULT 1,
                captain BOOLEAN DEFAULT FALSE,
                total_price INT DEFAULT 0,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS chats (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                owner_id INT NOT NULL,
                boat_id INT,
                boat_title VARCHAR(500),
                user_name VARCHAR(255),
                owner_name VARCHAR(255),
                last_message TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                chat_id INT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
                text TEXT,
                sender VARCHAR(50),
                is_own BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS boat_types (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                image TEXT DEFAULT '',
                sort_order INT DEFAULT 0
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS destinations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                image TEXT DEFAULT '',
                sort_order INT DEFAULT 0
            )
        `);

        const { rows: typesCount } = await client.query('SELECT COUNT(*) FROM boat_types');
        if (parseInt(typesCount[0].count, 10) === 0) {
            const defaultTypes = [
                ['Парусная яхта', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400', 0],
                ['Яхта', 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=400', 1],
                ['Понтон', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400', 2],
                ['Катер', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400', 3],
                ['Буксировщик', 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=400', 4],
                ['Гидроцикл', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400', 5],
            ];
            for (const [name, image, sort_order] of defaultTypes) {
                await client.query('INSERT INTO boat_types (name, image, sort_order) VALUES ($1, $2, $3)', [name, image, sort_order]);
            }
        }

        const { rows: destCount } = await client.query('SELECT COUNT(*) FROM destinations');
        if (parseInt(destCount[0].count, 10) === 0) {
            const defaultDests = [
                ['Москва', 'https://images.unsplash.com/photo-1513326738677-9646ab0f3b3b?w=400', 0],
                ['Московская область', 'https://images.unsplash.com/photo-1513326738677-9646ab0f3b3b?w=400', 1],
                ['Санкт-Петербург', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', 2],
                ['Сочи', 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=400', 3],
                ['Крым', 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400', 4],
                ['Казань', 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=400', 5],
            ];
            for (const [name, image, sort_order] of defaultDests) {
                await client.query('INSERT INTO destinations (name, image, sort_order) VALUES ($1, $2, $3)', [name, image, sort_order]);
            }
        } else {
            const { rows: hasMO } = await client.query("SELECT id FROM destinations WHERE LOWER(TRIM(name)) = 'московская область'");
            if (hasMO.length === 0) {
                const { rows: maxSort } = await client.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort FROM destinations');
                const nextSort = (maxSort[0]?.next_sort ?? 1);
                await client.query(
                    "INSERT INTO destinations (name, image, sort_order) VALUES ('Московская область', 'https://images.unsplash.com/photo-1513326738677-9646ab0f3b3b?w=400', $1)",
                    [nextSort]
                );
            }
        }

        // Добавить location_region для существующих БД
        await client.query(`ALTER TABLE boats ADD COLUMN IF NOT EXISTS location_region VARCHAR(255) DEFAULT ''`).catch(() => {});

        console.log('Миграция успешно завершена!');
    } catch (err) {
        console.error('Ошибка миграции:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
