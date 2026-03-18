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
               AND (b.start_at AT TIME ZONE COALESCE(boat.timezone, 'Europe/Moscow'))
                   < (NOW() AT TIME ZONE COALESCE(boat.timezone, 'Europe/Moscow'))`
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
                 (b.start_at AT TIME ZONE COALESCE(boat.timezone, 'Europe/Moscow'))
                 + (COALESCE(b.hours, 180)::int * interval '1 minute')
               ) < (NOW() AT TIME ZONE COALESCE(boat.timezone, 'Europe/Moscow'))`
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
            `SELECT COUNT(*)::int AS count
             FROM reviews r
             JOIN boats b ON b.id = r.boat_id AND b.owner_id = $1
             WHERE (r.status = 'approved' OR r.status IS NULL) AND COALESCE(r.spam, false) = false`,
            [req.user.id]
        );
        res.json({ count: rows[0]?.count ?? 0 });
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
