require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function seed() {
    const client = await pool.connect();
    try {
        const { rows: existing } = await client.query('SELECT COUNT(*) FROM users');
        if (parseInt(existing[0].count, 10) > 0) {
            console.log('Seed уже выполнен (есть пользователи). Пропуск.');
            return;
        }

        const hash = await bcrypt.hash('123', 10);

        await client.query(
            `INSERT INTO users (id, email, name, password_hash, role) VALUES
            (1, 'client@test.ru', 'Клиент', $1, 'client'),
            (2, 'owner@test.ru', 'Владелец', $1, 'owner'),
            (3, 'admin@test.ru', 'Администратор', $1, 'admin')`,
            [hash]
        );
        await client.query(`SELECT setval('users_id_seq', 3)`);

        const boatRows = [
            [2, 'Владелец', 'Катер класса люкс', 'Отличный катер для прогулок', '1', 'Катер', '', '', '', '7', '6', '', 'Москва', '', '', 55.75, 37.62, '5000', '', false, false, '', '["https://placehold.co/400x300/0F52BA/FFFFFF/png"]', '["Туалет","Кондиционер","Спасательные жилеты"]', null, null, null, 60, '[]', '[]', false, 'active', 4.8, 12, 5],
            [2, 'Владелец', 'Яхта «Аврора»', 'Роскошная яхта для вечеринок и прогулок по акватории.', '2', 'Яхта', '', '', '', '14', '10', '', 'Москва', '', '', 55.76, 37.6, '8500', '', true, false, '', '["https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&q=80"]', '["Туалет","Кондиционер","Аудиосистема","Холодильник"]', null, null, null, 60, '[]', '[]', true, 'active', 4.9, 28, 15],
            [2, 'Владелец', 'Катер Bayliner 285', 'Комфортный катер для семейного отдыха.', '1', 'Катер', '', '', '', '8', '8', '', 'Санкт-Петербург', '', '', 59.93, 30.32, '5000', '', false, false, '', '["https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80"]', '["Туалет","Bluetooth","Спасательные жилеты"]', null, null, null, 60, '[]', '[]', true, 'active', 4.7, 19, 8],
        ];

        for (const b of boatRows) {
            const vals = [...b.slice(0, 29), '', ...b.slice(29)];
            await client.query(
                `INSERT INTO boats (owner_id, owner_name, title, description, type_id, type_name, manufacturer, model, year, length_m, capacity, location_country, location_city, location_address, location_yacht_club, lat, lng, price_per_hour, price_per_day, captain_included, has_captain_option, rules, photos, amenities, schedule_work_days, schedule_weekday_hours, schedule_weekend_hours, schedule_min_duration, price_tiers, price_weekend, video_uris, instant_booking, status, rating, reviews_count, bookings_count)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36)`,
                vals
            );
        }

        console.log('Seed выполнен. Тестовые аккаунты: client@test.ru, owner@test.ru, admin@test.ru (пароль: 123)');
    } catch (err) {
        console.error('Ошибка seed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

seed();
