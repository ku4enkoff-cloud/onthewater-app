const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    database: process.env.PGDATABASE || 'boatrent',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '93583Fary',
});

async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255),
            first_name VARCHAR(255),
            last_name VARCHAR(255),
            password VARCHAR(255) NOT NULL,
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

    await pool.query(`
        CREATE TABLE IF NOT EXISTS tokens (
            token VARCHAR(255) PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await pool.query(`
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

    await pool.query(`
        ALTER TABLE boats ADD COLUMN IF NOT EXISTS price_weekend VARCHAR(50) DEFAULT ''
    `).catch(() => {});

    await pool.query(`
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
    await pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE SET NULL`).catch(() => {});

    await pool.query(`
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

    await pool.query(`
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

    await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            chat_id INT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
            text TEXT,
            sender VARCHAR(50),
            is_own BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS boat_types (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            image TEXT DEFAULT '',
            sort_order INT DEFAULT 0
        )
    `);
    await pool.query('ALTER TABLE boat_types ADD COLUMN IF NOT EXISTS image TEXT DEFAULT \'\'').catch(() => {});
    await pool.query('ALTER TABLE boat_types ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0').catch(() => {});
    const { rows: typesCount } = await pool.query('SELECT COUNT(*) FROM boat_types');
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
            await pool.query('INSERT INTO boat_types (name, image, sort_order) VALUES ($1, $2, $3)', [name, image, sort_order]);
        }
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS destinations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            image TEXT DEFAULT '',
            sort_order INT DEFAULT 0
        )
    `);
    await pool.query('ALTER TABLE destinations ADD COLUMN IF NOT EXISTS image TEXT DEFAULT \'\'').catch(() => {});
    await pool.query('ALTER TABLE destinations ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0').catch(() => {});
    const { rows: destCount } = await pool.query('SELECT COUNT(*) FROM destinations');
    if (parseInt(destCount[0].count, 10) === 0) {
        const defaultDests = [
            ['Москва', 'https://images.unsplash.com/photo-1513326738677-9646ab0f3b3b?w=400', 0],
            ['Санкт-Петербург', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', 1],
            ['Сочи', 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=400', 2],
            ['Крым', 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400', 3],
            ['Казань', 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=400', 4],
        ];
        for (const [name, image, sort_order] of defaultDests) {
            await pool.query('INSERT INTO destinations (name, image, sort_order) VALUES ($1, $2, $3)', [name, image, sort_order]);
        }
    }
}

async function seedData() {
    const { rows: existingUsers } = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(existingUsers[0].count, 10) > 0) return;

    await pool.query(`
        INSERT INTO users (id, email, name, password, role) VALUES
        (1, 'client@test.ru', 'Клиент', '123', 'client'),
        (2, 'owner@test.ru', 'Владелец', '123', 'owner'),
        (3, 'admin@test.ru', 'Администратор', '123', 'admin')
    `);
    await pool.query(`SELECT setval('users_id_seq', 3)`);

    const boatRows = [
        [2, 'Владелец', 'Катер класса люкс', 'Отличный катер для прогулок', '1', 'Катер', '', '', '', '7', '6', '', 'Москва', '', '', 55.75, 37.62, '5000', '', false, false, '', '["https://placehold.co/400x300/0F52BA/FFFFFF/png"]', '["Туалет","Кондиционер","Спасательные жилеты"]', null, null, null, 60, '[]', '[]', false, 'active', 4.8, 12, 5],
        [2, 'Владелец', 'Яхта «Аврора»', 'Роскошная яхта для вечеринок и прогулок по акватории. Полностью оборудована для комфортного отдыха.', '2', 'Яхта', '', '', '', '14', '10', '', 'Москва', '', '', 55.76, 37.60, '8500', '', true, false, '', '["https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&q=80"]', '["Туалет","Кондиционер","Аудиосистема","Холодильник","Спасательные жилеты"]', null, null, null, 60, '[]', '[]', true, 'active', 4.9, 28, 15],
        [2, 'Владелец', 'Катер Bayliner 285', 'Комфортный катер для семейного отдыха. Просторная палуба, удобные сиденья.', '1', 'Катер', '', '', '', '8', '8', '', 'Санкт-Петербург', '', '', 59.93, 30.32, '5000', '', false, false, '', '["https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80"]', '["Туалет","Bluetooth","Спасательные жилеты","Трап для купания"]', null, null, null, 60, '[]', '[]', true, 'active', 4.7, 19, 8],
        [2, 'Владелец', 'Парусник «Ветер»', 'Настоящий парусный опыт. Идеально для романтических прогулок и обучения парусному спорту.', '3', 'Парусная яхта', '', '', '', '12', '6', '', 'Сочи', '', '', 43.58, 39.72, '7000', '', true, false, '', '["https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=600&q=80"]', '["Спасательные жилеты","Якорь","Холодильник"]', null, null, null, 60, '[]', '[]', false, 'active', 4.6, 14, 6],
        [2, 'Владелец', 'Понтон Party Barge', 'Просторный понтон — идеален для праздников на воде. Вместительная платформа, устойчивый ход.', '4', 'Понтон', '', '', '', '10', '12', '', 'Казань', '', '', 55.79, 49.11, '4500', '', false, false, '', '["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&q=80"]', '["Аудиосистема","Bluetooth","Спасательные жилеты","Тент от солнца"]', null, null, null, 60, '[]', '[]', true, 'active', 4.5, 8, 4],
        [2, 'Владелец', 'Яхта Princess 50', 'Премиальная моторная яхта для VIP-мероприятий. Три каюты, полное оснащение.', '2', 'Яхта', '', '', '', '15', '12', '', 'Москва', '', '', 55.74, 37.63, '15000', '', true, false, '', '["https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=600&q=80"]', '["Туалет","Кондиционер","Аудиосистема","Холодильник","Bluetooth","Трап для купания","Спасательные жилеты","Якорь"]', null, null, null, 60, '[]', '[]', true, 'active', 5.0, 42, 22],
        [2, 'Владелец', 'Катер Grizzly 580', 'Надёжный катер для рыбалки и коротких прогулок. Мощный мотор, устойчивый корпус.', '1', 'Катер', '', '', '', '6', '5', '', 'Нижний Новгород', '', '', 56.32, 44.00, '3500', '', false, false, '', '["https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=600&q=80"]', '["Спасательные жилеты","Якорь","Эхолот"]', null, null, null, 60, '[]', '[]', false, 'active', 4.4, 6, 3],
        [2, 'Владелец', 'Гидроцикл Yamaha FX', 'Мощный гидроцикл для экстремального отдыха. Скорость до 100 км/ч.', '5', 'Гидроцикл', '', '', '', '3', '2', '', 'Сочи', '', '', 43.59, 39.73, '2500', '', false, false, '', '["https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=600&q=80"]', '["Спасательные жилеты"]', null, null, null, 60, '[]', '[]', true, 'active', 4.8, 32, 18],
        [2, 'Владелец', 'Яхта Azimut 55', 'Элегантная итальянская яхта. Идеальна для многодневных путешествий и торжественных мероприятий.', '2', 'Яхта', '', '', '', '17', '14', '', 'Санкт-Петербург', '', '', 59.94, 30.31, '20000', '', true, false, '', '["https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=600&q=80"]', '["Туалет","Кондиционер","Аудиосистема","Холодильник","Bluetooth","Трап для купания","Спасательные жилеты","Якорь"]', null, null, null, 60, '[]', '[]', true, 'active', 5.0, 66, 30],
        [2, 'Владелец', 'Катер «Волна»', 'Универсальный катер для прогулок и рыбалки. Экономичный расход топлива.', '1', 'Катер', '', '', '', '7', '6', '', 'Крым', '', '', 44.50, 34.17, '4000', '', false, false, '', '["https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=600&q=80"]', '["Туалет","Спасательные жилеты","Якорь","Тент от солнца"]', null, null, null, 60, '[]', '[]', false, 'active', 4.3, 9, 5],
        [2, 'Владелец', 'Парусник Bavaria 40', 'Немецкое качество и комфорт. Две каюты, камбуз, душ. Идеальна для круизов.', '3', 'Парусная яхта', '', '', '', '12', '8', '', 'Москва', '', '', 55.75, 37.61, '9000', '', true, false, '', '["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"]', '["Туалет","Холодильник","Спасательные жилеты","Якорь","Аудиосистема"]', null, null, null, 60, '[]', '[]', true, 'active', 4.7, 21, 11],
    ];

    for (const b of boatRows) {
        const vals = [...b.slice(0, 29), '', ...b.slice(29)];
        await pool.query(`
            INSERT INTO boats (owner_id, owner_name, title, description, type_id, type_name, manufacturer, model, year, length_m, capacity, location_country, location_city, location_address, location_yacht_club, lat, lng, price_per_hour, price_per_day, captain_included, has_captain_option, rules, photos, amenities, schedule_work_days, schedule_weekday_hours, schedule_weekend_hours, schedule_min_duration, price_tiers, price_weekend, video_uris, instant_booking, status, rating, reviews_count, bookings_count)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36)
        `, vals);
    }

    const reviewRows = [
        [1, 'Алексей', 5, 'Отличный катер, всё понравилось. Капитан профессионал.', '2024-02-01T12:00:00Z'],
        [1, 'Мария', 5, 'Прекрасная прогулка по Москве-реке. Рекомендую!', '2024-02-10T14:30:00Z'],
        [1, 'Дмитрий', 4, 'Всё хорошо, немного ждали у причала.', '2024-02-15T09:00:00Z'],
        [2, 'Ольга', 5, 'Потрясающая яхта! Провели незабываемый вечер. Капитан был очень внимателен.', '2025-06-15T18:00:00Z'],
        [2, 'Сергей', 5, 'Лучший день рождения на воде! Всем рекомендую.', '2025-07-20T10:00:00Z'],
        [2, 'Наталья', 4, 'Красивая яхта, хорошее обслуживание. Немного качало.', '2025-08-05T14:00:00Z'],
        [3, 'Андрей', 5, 'Отличный катер для семейной прогулки по Неве!', '2025-05-10T11:00:00Z'],
        [3, 'Елена', 4, 'Комфортно, чисто, капитан рассказал много интересного о городе.', '2025-06-01T16:00:00Z'],
        [7, 'Виктор', 5, 'Яхта Princess — это мечта! VIP-сервис на высшем уровне.', '2025-09-12T12:00:00Z'],
        [7, 'Анна', 5, 'Провели свадебную вечеринку. Идеально!', '2025-10-01T15:00:00Z'],
        [7, 'Павел', 5, 'Три каюты, полное оснащение — рекомендую для корпоративов.', '2025-10-20T09:00:00Z'],
        [7, 'Ирина', 5, 'Потрясающие виды на Москву-реку с палубы. Обязательно вернёмся!', '2025-11-05T17:00:00Z'],
    ];

    for (const r of reviewRows) {
        await pool.query(
            'INSERT INTO reviews (boat_id, user_name, rating, text, created_at) VALUES ($1,$2,$3,$4,$5)',
            r,
        );
    }

    console.log('Seed data inserted successfully');
}

module.exports = { pool, initDB, seedData };
