const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const { sendPush } = require('../utils/push');

const router = express.Router();

async function sendBookingPushToClient(userId, title, body, bookingId) {
    try {
        const { rows } = await pool.query('SELECT push_token FROM users WHERE id = $1', [userId]);
        const token = rows[0]?.push_token;
        if (token) await sendPush(token, title, body, { bookingId, type: 'booking' });
    } catch (_) {}
}

function makeFallbackEmailByPhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '').slice(-11) || 'no_phone';
    return `owner_manual_${digits}_${Date.now()}@placeholder.local`;
}

router.get('/bookings', authenticate, async (req, res, next) => {
    try {
        // Неподтверждённые бронирования, срок которых уже прошёл — автоматически в отменённые
        await pool.query(
            `UPDATE bookings b
             SET status = 'cancelled'
             FROM boats boat
             WHERE b.boat_id = boat.id
               AND b.status = 'pending'
               AND b.start_at IS NOT NULL
               AND (b.start_at AT TIME ZONE 'Europe/Moscow')
                   < (NOW() AT TIME ZONE 'Europe/Moscow')`
        );
        // Подтверждённые бронирования, время которых прошло — в завершённые
        await pool.query(
            `UPDATE bookings b
             SET status = 'completed'
             FROM boats boat
             WHERE b.boat_id = boat.id
               AND b.status = 'confirmed'
               AND b.start_at IS NOT NULL
               AND (
                 (b.start_at AT TIME ZONE 'Europe/Moscow')
                 + (COALESCE(b.hours, 180)::int * interval '1 minute')
               ) < (NOW() AT TIME ZONE 'Europe/Moscow')`
        );
        const { rows: rawRows } = await pool.query(
            `SELECT b.*, boat.schedule_work_days as boat_schedule_work_days,
              boat.location_city, boat.location_address, boat.location_yacht_club,
              boat.location_country, boat.location_region, boat.lat, boat.lng
             FROM bookings b
             LEFT JOIN boats boat ON boat.id = b.boat_id
             WHERE b.owner_id = $1
             ORDER BY b.created_at DESC`,
            [req.user.id]
        );
        const userIds = [...new Set(rawRows.map((r) => r.user_id).filter(Boolean))];
        const usersMap = {};
        if (userIds.length > 0) {
            const { rows: userRows } = await pool.query(
                'SELECT id, name, first_name, last_name, email, phone FROM users WHERE id = ANY($1)',
                [userIds]
            );
            userRows.forEach((u) => {
                const displayName = (u.name && String(u.name).trim()) || (u.first_name || u.last_name ? [u.first_name, u.last_name].filter(Boolean).join(' ').trim() : null) || u.email;
                usersMap[u.id] = { name: displayName || null, phone: u.phone || null };
            });
        }
        const rows = rawRows.map((b) => {
            const { boat_schedule_work_days, ...rest } = b;
            const userMeta = usersMap[b.user_id] || {};
            return {
                ...rest,
                client_name: userMeta.name || null,
                client_phone: userMeta.phone || null,
                schedule_work_days: boat_schedule_work_days,
            };
        });
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// Приводит часы (1-24) или минуты (30, 60, 120...) к минутам
function normalizeDurationToMinutes(hours) {
    if (hours == null) return 180;
    const n = Number(hours);
    if (Number.isNaN(n)) return 180;
    // На клиенте могли прислать "часы" (раньше была логика в других местах)
    if (Number.isInteger(n) && n >= 1 && n <= 24) return n * 60;
    return n;
}

function getBoatPhoto(boat) {
    try {
        const photos = boat?.photos && Array.isArray(boat.photos)
            ? boat.photos
            : (typeof boat.photos === 'string' ? JSON.parse(boat.photos || '[]') : []);
        const first = photos[0];
        return typeof first === 'string'
            ? first
            : (first?.location || first?.url || first?.filename || '') || '';
    } catch (_) {
        return '';
    }
}

// Ручное создание бронирования владельцем
router.post('/bookings', authenticate, async (req, res, next) => {
    try {
        const ownerId = parseInt(req.user.id, 10);
        const { boat_id, user_id, start_at, hours, passengers, captain, total_price, status } = req.body || {};

        const boatId = parseInt(boat_id, 10);
        const clientUserId = parseInt(user_id, 10);
        if (Number.isNaN(ownerId) || Number.isNaN(boatId) || Number.isNaN(clientUserId)) {
            return res.status(400).json({ error: 'Invalid ids' });
        }
        if (!start_at) return res.status(400).json({ error: 'Укажите start_at' });

        const durationMinutes = normalizeDurationToMinutes(hours);
        if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
            return res.status(400).json({ error: 'Некорректная длительность' });
        }
        const startDate = new Date(start_at);
        if (Number.isNaN(startDate.getTime())) {
            return res.status(400).json({ error: 'Некорректный start_at' });
        }
        const startIso = startDate.toISOString();

        const captainBool =
            captain === true || captain === 'true' || captain === 1 || captain === '1';
        const passengersInt = Number.isFinite(Number(passengers)) ? parseInt(passengers, 10) : 1;
        const totalPriceInt = Number.isFinite(Number(total_price)) ? parseInt(total_price, 10) : 0;

        const bookingStatus = status === 'pending' || status === 'confirmed' ? status : 'confirmed';

        // Проверяем, что катер принадлежит текущему владельцу
        const { rows: boatRows } = await pool.query(
            'SELECT id, owner_id, title, photos FROM boats WHERE id = $1 LIMIT 1',
            [boatId]
        );
        if (boatRows.length === 0) return res.status(404).json({ error: 'Катер не найден' });
        const boat = boatRows[0];
        if (Number(boat.owner_id) !== Number(ownerId)) return res.status(403).json({ error: 'Нет прав на этот катер' });

        // Конфликты по времени (пересечение интервалов) среди pending/confirmed
        const { rows: conflictRows } = await pool.query(
            `SELECT id
             FROM bookings
             WHERE owner_id = $1
               AND boat_id = $2
               AND status IN ('pending', 'confirmed')
               AND start_at IS NOT NULL
               AND start_at < ($3::timestamptz + ($4::int * interval '1 minute'))
               AND (start_at + (COALESCE(hours, 180)::int * interval '1 minute')) > $3::timestamptz
             LIMIT 1`,
            [ownerId, boatId, startIso, durationMinutes]
        );
        if (conflictRows.length > 0) {
            return res.status(409).json({ error: 'В это время уже есть бронирование' });
        }

        const boatPhoto = getBoatPhoto(boat);

        const { rows: inserted } = await pool.query(
            `INSERT INTO bookings (user_id, owner_id, boat_id, boat_title, boat_photo, start_at, hours, passengers, captain, total_price, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             RETURNING *`,
            [
                clientUserId,
                ownerId,
                boatId,
                boat.title || 'Катер',
                boatPhoto || null,
                startIso,
                durationMinutes,
                passengersInt,
                captainBool,
                totalPriceInt,
                bookingStatus,
            ]
        );

        const booking = inserted[0];

        if (bookingStatus === 'confirmed') {
            sendBookingPushToClient(
                booking.user_id,
                'Бронирование подтверждено',
                `Ваше бронирование «${booking.boat_title || 'Катер'}» подтверждено.`,
                booking.id
            );
        }

        res.status(201).json(booking);
    } catch (err) {
        if (err?.code === '23503') {
            return res.status(400).json({ error: 'Клиент не найден в базе пользователей' });
        }
        next(err);
    }
});

// Клиенты владельца: из бронирований + ручные записи
router.get('/clients', authenticate, async (req, res, next) => {
    try {
        const ownerId = parseInt(req.user.id, 10);
        if (Number.isNaN(ownerId)) return res.status(400).json({ error: 'Invalid owner id' });

        // Клиенты из бронирований
        const { rows: bookingClients } = await pool.query(
            `SELECT
                 u.id AS user_id,
                 u.name,
                 u.first_name,
                 u.last_name,
                 u.email,
                 u.phone,
                 COUNT(b.*)::int AS bookings_count,
                 MAX(b.created_at) AS last_booking_at,
                 MAX(b.boat_title) AS last_boat_title
             FROM bookings b
             JOIN users u ON u.id = b.user_id
             WHERE b.owner_id = $1
             GROUP BY u.id, u.name, u.first_name, u.last_name, u.email, u.phone`,
            [ownerId]
        );

        // Ручные клиенты (если таблица ещё не создана, просто пропускаем)
        let manualClients = [];
        try {
            const resManual = await pool.query(
                `SELECT
                     oc.id,
                     oc.user_id,
                     oc.name,
                     oc.phone,
                     oc.email,
                     oc.note,
                     oc.created_at
                 FROM owner_clients oc
                 WHERE oc.owner_id = $1`,
                [ownerId]
            );
            manualClients = resManual.rows || [];
        } catch (_) {
            manualClients = [];
        }

        const map = new Map();

        bookingClients.forEach((c) => {
            const fullName =
                [c.first_name, c.last_name]
                    .filter(Boolean)
                    .map((v) => String(v).trim())
                    .filter(Boolean)
                    .join(' ')
                    .trim() ||
                (c.name && String(c.name).trim()) ||
                (c.email && String(c.email).trim()) ||
                'Клиент';
            map.set(c.user_id, {
                id: c.user_id,
                user_id: c.user_id,
                name: fullName,
                phone: c.phone || null,
                email: c.email || null,
                note: null,
                bookings_count: c.bookings_count,
                last_booking_at: c.last_booking_at,
                last_boat_title: c.last_boat_title || null,
                source: 'booking',
                owner_client_id: null,
            });
        });

        manualClients.forEach((m) => {
            const existing = m.user_id ? map.get(m.user_id) : null;
            // Если клиент уже есть в базе пользователей/бронирований, считаем эти данные
            // источником истины и не перетираем их ручными правками в owner_clients.
            const baseName =
                existing?.name ||
                (m.name && String(m.name).trim()) ||
                m.email ||
                'Клиент';
            const idKey = m.user_id || `manual-${m.id}`;
            const merged = existing || {
                id: idKey,
                user_id: m.user_id || null,
                bookings_count: 0,
                last_booking_at: null,
                last_boat_title: null,
                source: 'manual',
                owner_client_id: m.id,
            };
            map.set(idKey, {
                ...merged,
                name: baseName,
                phone: merged.phone || m.phone || null,
                email: merged.email || m.email || null,
                note: m.note || merged.note || null,
            });
        });

        const list = Array.from(map.values()).sort((a, b) => {
            const aDate = a.last_booking_at || a.created_at;
            const bDate = b.last_booking_at || b.created_at;
            if (!aDate && !bDate) return 0;
            if (!aDate) return 1;
            if (!bDate) return -1;
            return new Date(bDate) - new Date(aDate);
        });

        res.json(list);
    } catch (err) {
        next(err);
    }
});

// Добавить/привязать клиента к базе владельца
router.post('/clients', authenticate, async (req, res, next) => {
    try {
        const ownerId = parseInt(req.user.id, 10);
        if (Number.isNaN(ownerId)) return res.status(400).json({ error: 'Invalid owner id' });
        const { name, phone, email, note } = req.body || {};

        if (!phone && !email && !name) {
            return res.status(400).json({ error: 'Укажите хотя бы имя или телефон' });
        }

        const normalizedPhone = phone ? String(phone).replace(/\D/g, '').replace(/^8/, '7') : null;
        const normalizedEmail = email ? String(email).trim().toLowerCase() : null;

        let userId = null;
        if (normalizedPhone || normalizedEmail) {
            const { rows: found } = await pool.query(
                `SELECT id
                 FROM users
                 WHERE ($1::text IS NOT NULL AND regexp_replace(REGEXP_REPLACE(COALESCE(phone, ''), '\\D', '', 'g'), '^8', '7') = $1)
                    OR ($2::text IS NOT NULL AND LOWER(TRIM(COALESCE(email, ''))) = $2)
                 LIMIT 1`,
                [normalizedPhone || null, normalizedEmail || null]
            );
            if (found.length > 0) {
                userId = found[0].id;
            } else {
                // Вариант 1: авто-регистрируем технического пользователя, если не найден.
                // Это позволяет создавать бронирование (bookings.user_id обязателен).
                const emailForInsert = normalizedEmail || makeFallbackEmailByPhone(normalizedPhone || phone);
                const { rows: created } = await pool.query(
                    `INSERT INTO users (name, phone, email)
                     VALUES ($1, $2, $3)
                     RETURNING id`,
                    [name || null, phone || null, emailForInsert]
                );
                userId = created[0].id;
            }
        }

        if (userId == null) {
            return res.status(400).json({ error: 'Не удалось определить клиента' });
        }

        // Если уже есть запись owner_clients по user_id — возвращаем её как успешный результат.
        const { rows: existingByUser } = await pool.query(
            'SELECT * FROM owner_clients WHERE owner_id = $1 AND user_id = $2 LIMIT 1',
            [ownerId, userId]
        );
        if (existingByUser.length > 0) {
            return res.status(200).json(existingByUser[0]);
        }

        // Если есть ручная запись по тому же телефону/email (user_id NULL) — обновим её и привяжем к user_id.
        const { rows: existingManualForLink } = await pool.query(
            `SELECT * FROM owner_clients
             WHERE owner_id = $1 AND user_id IS NULL
               AND (($2::text IS NOT NULL AND TRIM(COALESCE(phone,'')) = TRIM($2))
                    OR ($3::text IS NOT NULL AND LOWER(TRIM(COALESCE(email,''))) = LOWER(TRIM($3))))
             LIMIT 1`,
            [ownerId, phone || null, normalizedEmail || null]
        );
        if (existingManualForLink.length > 0) {
            const manual = existingManualForLink[0];
            const { rows: linked } = await pool.query(
                `UPDATE owner_clients
                 SET user_id = $1,
                     name = COALESCE(NULLIF(TRIM($2), ''), name),
                     phone = COALESCE(NULLIF(TRIM($3), ''), phone),
                     email = COALESCE(NULLIF(TRIM($4), ''), email)
                 WHERE id = $5
                 RETURNING *`,
                [userId, name || null, phone || null, normalizedEmail || null, manual.id]
            );
            return res.status(200).json(linked[0]);
        }

        // Не добавлять одного и того же клиента дважды
        try {
            const { rows: existingManual } = await pool.query(
                `SELECT id FROM owner_clients
                 WHERE owner_id = $1 AND user_id IS NULL
                   AND (($2::text IS NOT NULL AND TRIM(COALESCE(phone,'')) = TRIM($2))
                        OR ($3::text IS NOT NULL AND LOWER(TRIM(COALESCE(email,''))) = LOWER(TRIM($3))))
                 LIMIT 1`,
                [ownerId, phone || null, normalizedEmail || null]
            );
            if (existingManual.length > 0) {
                return res.status(400).json({ error: 'Клиент с таким телефоном или email уже добавлен' });
            }
        } catch (e) {
            // таблица owner_clients может отсутствовать
        }

        const { rows } = await pool.query(
            `INSERT INTO owner_clients (owner_id, user_id, name, phone, email, note)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [ownerId, userId, name || null, phone || null, email || null, note || null]
        );

        res.status(201).json(rows[0]);
    } catch (err) {
        if (err && err.code === '23505') {
            return res.status(400).json({ error: 'Клиент уже существует' });
        }
        next(err);
    }
});

// Удалить клиента из базы владельца (только ручные записи owner_clients)
router.delete('/clients/:id', authenticate, async (req, res, next) => {
    try {
        const ownerId = parseInt(req.user.id, 10);
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(ownerId) || Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid id' });
        }
        const { rowCount } = await pool.query(
            'DELETE FROM owner_clients WHERE id = $1 AND owner_id = $2',
            [id, ownerId]
        );
        if (rowCount === 0) {
            return res.status(404).json({ error: 'Клиент не найден' });
        }
        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

// Поиск клиента по телефону/email для автозаполнения формы
router.get('/clients/lookup', authenticate, async (req, res, next) => {
    try {
        const ownerId = parseInt(req.user.id, 10);
        if (Number.isNaN(ownerId)) return res.status(400).json({ error: 'Invalid owner id' });

        const phone = (req.query.phone || '').trim();
        const email = (req.query.email || '').trim();

        if (!phone && !email) {
            return res.status(400).json({ error: 'Укажите phone или email' });
        }

        // 1) Сначала ищем среди ручной базы владельца `owner_clients`
        // Возвращаем `id` как owner_clients.user_id (может быть null),
        // но если user_id не проставлен, попытаемся подтянуть user_id из таблицы `users`,
        // чтобы владелец мог создать бронь без ручного связывания.
        const { rows: ownerClientRows } = await pool.query(
            `SELECT
                 oc.user_id AS owner_user_id,
                 oc.name AS owner_name,
                 oc.phone AS owner_phone,
                 oc.email AS owner_email,
                 u.id AS u_id,
                 u.name AS u_name,
                 u.first_name AS u_first_name,
                 u.last_name AS u_last_name,
                 u.email AS u_email
             FROM owner_clients oc
             LEFT JOIN users u ON u.id = oc.user_id
             WHERE oc.owner_id = $1
               AND (
                    ($2::text IS NOT NULL AND regexp_replace(REGEXP_REPLACE(COALESCE(oc.phone, ''), '\\D', '', 'g'), '^8', '7') =
                                            regexp_replace(REGEXP_REPLACE($2, '\\D', '', 'g'), '^8', '7'))
                    OR ($3::text IS NOT NULL AND LOWER(COALESCE(oc.email, '')) = LOWER($3))
               )
             LIMIT 1`,
            [ownerId, phone || null, email || null]
        );

        if (ownerClientRows.length > 0) {
            const oc = ownerClientRows[0];
            const ownerName = oc.owner_name || null;

            // Стараемся вернуть user_id, даже если в owner_clients он не заполнен
            let userId = oc.owner_user_id ?? null;
            if (userId == null) {
                const { rows: foundUsers } = await pool.query(
                    `SELECT id, name, first_name, last_name, phone, email
                     FROM users
                     WHERE ($1::text IS NOT NULL AND regexp_replace(REGEXP_REPLACE(COALESCE(phone, ''), '\\D', '', 'g'), '^8', '7') =
                                            regexp_replace(REGEXP_REPLACE($1, '\\D', '', 'g'), '^8', '7'))
                        OR ($2::text IS NOT NULL AND LOWER(COALESCE(email, '')) = LOWER($2))
                     LIMIT 1`,
                    [phone || null, email || null]
                );
                if (foundUsers.length > 0) {
                    userId = foundUsers[0]?.id ?? null;
                }
            }

            const fullName =
                ownerName ||
                [oc.u_first_name, oc.u_last_name]
                    .filter(Boolean)
                    .map((v) => String(v).trim())
                    .filter(Boolean)
                    .join(' ')
                    .trim() ||
                (oc.u_name && String(oc.u_name).trim()) ||
                (oc.u_email && String(oc.u_email).trim()) ||
                (oc.owner_email && String(oc.owner_email).trim()) ||
                null;

            return res.json({
                id: userId,
                name: fullName,
                phone: oc.owner_phone ?? null,
                email: oc.owner_email ?? oc.u_email ?? null,
            });
        }

        // 2) Если в owner_clients не нашли — ищем в общей базе `users` (как было раньше)
        const { rows } = await pool.query(
            `SELECT id, name, first_name, last_name, phone, email
             FROM users
             WHERE ($1::text IS NOT NULL AND regexp_replace(REGEXP_REPLACE(COALESCE(phone, ''), '\\D', '', 'g'), '^8', '7') =
                        regexp_replace(REGEXP_REPLACE($1, '\\D', '', 'g'), '^8', '7'))
                OR ($2::text IS NOT NULL AND LOWER(COALESCE(email, '')) = LOWER($2))
             LIMIT 1`,
            [phone || null, email || null]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Клиент не найден' });
        }

        const u = rows[0];
        const fullName =
            [u.first_name, u.last_name]
                .filter(Boolean)
                .map((v) => String(v).trim())
                .filter(Boolean)
                .join(' ')
                .trim() ||
            (u.name && String(u.name).trim()) ||
            u.email ||
            null;

        res.json({
            id: u.id,
            name: fullName,
            phone: u.phone,
            email: u.email,
        });
    } catch (err) {
        next(err);
    }
});

// Открыть (или создать) чат с клиентом по бронированию
router.post('/bookings/:id/chat', authenticate, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const ownerId = parseInt(req.user.id, 10);
        if (Number.isNaN(id) || Number.isNaN(ownerId)) {
            return res.status(400).json({ error: 'Invalid id' });
        }

        const { rows: bookingRows } = await pool.query(
            `SELECT b.*, boat.title AS boat_title_db
             FROM bookings b
             LEFT JOIN boats boat ON boat.id = b.boat_id
             WHERE b.id = $1 AND b.owner_id = $2`,
            [id, ownerId]
        );
        if (bookingRows.length === 0) {
            return res.status(404).json({ error: 'Бронирование не найдено' });
        }
        const booking = bookingRows[0];
        const boatId = booking.boat_id;
        const userId = booking.user_id;
        if (!boatId || !userId) {
            return res.status(400).json({ error: 'Для этого бронирования не найден клиент или катер' });
        }

        const { rows: existing } = await pool.query(
            'SELECT * FROM chats WHERE user_id = $1 AND owner_id = $2 AND boat_id = $3 LIMIT 1',
            [userId, ownerId, boatId]
        );
        if (existing.length > 0) {
            return res.json(existing[0]);
        }

        const { rows: userRows } = await pool.query(
            'SELECT name, first_name, last_name, email FROM users WHERE id = $1',
            [userId]
        );
        const user = userRows[0] || {};
        const userDisplayName =
            [user.first_name, user.last_name]
                .filter(Boolean)
                .map((v) => String(v).trim())
                .filter(Boolean)
                .join(' ')
                .trim() ||
            (user.name && String(user.name).trim()) ||
            (user.email && String(user.email).trim()) ||
            'Клиент';

        const ownerDisplayName =
            (req.user.name && String(req.user.name).trim()) ||
            (req.user.first_name && String(req.user.first_name).trim()) ||
            (req.user.email && String(req.user.email).trim()) ||
            'Владелец';

        const boatTitle = booking.boat_title || booking.boat_title_db || '';

        const { rows: inserted } = await pool.query(
            `INSERT INTO chats (user_id, owner_id, boat_id, boat_title, user_name, owner_name)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [userId, ownerId, boatId, boatTitle, userDisplayName, ownerDisplayName]
        );
        res.status(201).json(inserted[0]);
    } catch (err) {
        next(err);
    }
});

router.post('/bookings/:id/confirm', authenticate, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `UPDATE bookings SET status = 'confirmed' WHERE id = $1 AND owner_id = $2 RETURNING *`,
            [parseInt(req.params.id, 10), req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        const booking = rows[0];
        sendBookingPushToClient(
            booking.user_id,
            'Бронирование подтверждено',
            `Ваше бронирование «${booking.boat_title || 'Катер'}» подтверждено.`,
            booking.id
        );
        res.json(booking);
    } catch (err) {
        next(err);
    }
});

router.post('/bookings/:id/decline', authenticate, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rows: before } = await pool.query('SELECT id, user_id, boat_title FROM bookings WHERE id = $1 AND owner_id = $2', [id, req.user.id]);
        if (before.length === 0) return res.status(404).json({ error: 'Not found' });
        const b = before[0];
        const { rows } = await pool.query('DELETE FROM bookings WHERE id = $1 AND owner_id = $2 RETURNING id', [id, req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        sendBookingPushToClient(b.user_id, 'Бронирование отменено', `«${b.boat_title || 'Катер'}» отменено владельцем.`, b.id);
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

router.patch('/bookings/:id', authenticate, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const ownerId = parseInt(req.user.id, 10);
        if (isNaN(id) || isNaN(ownerId)) return res.status(400).json({ error: 'Invalid id' });
        const { start_at, hours } = req.body || {};
        const { rows: existing } = await pool.query(
            'SELECT * FROM bookings WHERE id = $1 AND owner_id = $2',
            [id, ownerId]
        );
        if (existing.length === 0) {
            const { rows: anyBooking } = await pool.query('SELECT id, owner_id FROM bookings WHERE id = $1', [id]);
            if (anyBooking.length === 0) {
                return res.status(404).json({ error: 'Бронирование не найдено' });
            }
            return res.status(403).json({ error: 'Нет прав на редактирование этого бронирования' });
        }
        const booking = existing[0];
        if (booking.status !== 'pending' && booking.status !== 'confirmed') {
            return res.status(400).json({ error: 'Редактировать можно только ожидающие и подтверждённые бронирования' });
        }
        const updates = [];
        const vals = [];
        let idx = 1;
        if (start_at != null) { updates.push(`start_at = $${idx++}`); vals.push(start_at); }
        if (hours != null) { updates.push(`hours = $${idx++}`); vals.push(hours); }
        if (updates.length === 0) return res.json(booking);
        vals.push(id, ownerId);
        const { rows } = await pool.query(
            `UPDATE bookings SET ${updates.join(', ')} WHERE id = $${idx} AND owner_id = $${idx + 1} RETURNING *`,
            vals
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        const updated = rows[0];
        sendBookingPushToClient(updated.user_id, 'Бронирование изменено', `Владелец изменил параметры бронирования «${updated.boat_title || 'Катер'}». Проверьте детали.`, updated.id);
        res.json(updated);
    } catch (err) {
        next(err);
    }
});

router.get('/reviews-count', authenticate, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT COUNT(*)::int AS count,
                    ROUND(AVG(r.rating)::numeric, 1) AS avg_rating
             FROM reviews r
             JOIN boats b ON b.id = r.boat_id AND b.owner_id = $1
             WHERE (r.status = 'approved' OR r.status IS NULL) AND COALESCE(r.spam, false) = false`,
            [req.user.id]
        );
        const count = rows[0]?.count ?? 0;
        const avgRating = count > 0 && rows[0]?.avg_rating != null ? Number(rows[0].avg_rating) : null;
        res.json({ count, avgRating });
    } catch (err) {
        next(err);
    }
});

router.get('/unread-messages-count', authenticate, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT COUNT(*)::int AS count
             FROM messages m
             JOIN chats c ON c.id = m.chat_id AND c.owner_id = $1
             WHERE m.sender = 'me' AND (m.read = false OR m.read IS NULL)`,
            [req.user.id]
        );
        res.json({ count: rows[0]?.count ?? 0 });
    } catch (err) {
        next(err);
    }
});

// Скорость ответов владельца:
// среднее между скоростью обработки бронирований и скоростью ответа на сообщения.
router.get('/response-rate', authenticate, async (req, res, next) => {
    try {
        const ownerId = parseInt(req.user.id, 10);
        if (Number.isNaN(ownerId)) return res.status(400).json({ error: 'Invalid owner id' });

        // 1) Бронирования: доля обработанных (не pending)
        const { rows: bookingAggRows } = await pool.query(
            `SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed', 'cancelled'))::int AS processed
             FROM bookings
             WHERE owner_id = $1`,
            [ownerId]
        );
        const bookingTotal = Number(bookingAggRows[0]?.total || 0);
        const bookingProcessed = Number(bookingAggRows[0]?.processed || 0);
        const bookingRate = bookingTotal > 0 ? Math.round((bookingProcessed / bookingTotal) * 100) : null;

        // 2) Сообщения: доля клиентских сообщений, на которые владелец ответил <= 60 минут
        const { rows: msgAggRows } = await pool.query(
            `WITH incoming AS (
                SELECT m.id, m.chat_id, m.created_at
                FROM messages m
                JOIN chats c ON c.id = m.chat_id
                WHERE c.owner_id = $1 AND m.sender = 'me'
             ),
             first_reply AS (
                SELECT i.id AS incoming_id,
                       MIN(m2.created_at) AS reply_at
                FROM incoming i
                LEFT JOIN messages m2
                  ON m2.chat_id = i.chat_id
                 AND m2.sender = 'owner'
                 AND m2.created_at > i.created_at
                GROUP BY i.id
             )
             SELECT
                COUNT(*)::int AS total_incoming,
                COUNT(*) FILTER (
                    WHERE reply_at IS NOT NULL
                      AND EXTRACT(EPOCH FROM (reply_at - (SELECT created_at FROM incoming WHERE id = incoming_id))) <= 3600
                )::int AS fast_replied
             FROM first_reply`,
            [ownerId]
        );
        const incomingTotal = Number(msgAggRows[0]?.total_incoming || 0);
        const fastReplied = Number(msgAggRows[0]?.fast_replied || 0);
        const messageRate = incomingTotal > 0 ? Math.round((fastReplied / incomingTotal) * 100) : null;

        let responseRate = null;
        if (bookingRate != null && messageRate != null) {
            responseRate = Math.round((bookingRate + messageRate) / 2);
        } else if (bookingRate != null) {
            responseRate = bookingRate;
        } else if (messageRate != null) {
            responseRate = messageRate;
        }

        res.json({
            responseRate,
            bookingRate,
            messageRate,
            bookingTotal,
            incomingTotal,
        });
    } catch (err) {
        next(err);
    }
});

router.get('/chats', authenticate, async (req, res, next) => {
    try {
        // Показываем владельцу полное имя клиента (name или first_name+last_name), чтобы фамилия тоже отображалась
        // даже для уже созданных чатов.
        const { rows } = await pool.query(
            `SELECT c.*,
                    u.name AS user_name_fallback,
                    u.first_name AS user_first_name,
                    u.last_name AS user_last_name,
                    u.avatar AS client_avatar,
                    u.email AS user_email
             FROM chats c
             LEFT JOIN users u ON u.id = c.user_id
             WHERE c.owner_id = $1
             ORDER BY c.created_at DESC`,
            [req.user.id]
        );

        const mapped = rows.map((c) => {
            const display =
                [c.user_first_name, c.user_last_name]
                    .filter(Boolean)
                    .map((v) => String(v).trim())
                    .filter(Boolean)
                    .join(' ')
                    .trim() ||
                (c.user_name_fallback && String(c.user_name_fallback).trim()) ||
                (c.user_email && String(c.user_email).trim()) ||
                c.user_name ||
                null;

            const { user_name_fallback, user_first_name, user_last_name, user_email, ...rest } = c;
            return { ...rest, user_name: display };
        });

        res.json(mapped);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
