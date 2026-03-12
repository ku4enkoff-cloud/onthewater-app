const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// В БД в колонке hours всегда храним длительность в МИНУТАХ (клиент присылает минуты: 30, 60, 120...).
// Для совместимости: если пришло целое число 1–24, считаем это часами и переводим в минуты.
function normalizeDurationToMinutes(hours) {
    if (hours == null) return 180;
    const n = Number(hours);
    if (Number.isNaN(n)) return 180;
    if (Number.isInteger(n) && n >= 1 && n <= 24) return n * 60; // раньше могли слать часы
    return n; // уже минуты
}

router.post('/', authenticate, async (req, res, next) => {
    try {
        const { boat_id, start_at, hours, passengers, captain, total_price } = req.body || {};
        const { rows: boatRows } = await pool.query('SELECT * FROM boats WHERE id = $1', [parseInt(boat_id, 10)]);
        if (boatRows.length === 0) return res.status(404).json({ error: 'Катер не найден' });
        const boat = boatRows[0];

        const photos = boat.photos && Array.isArray(boat.photos) ? boat.photos : (typeof boat.photos === 'string' ? JSON.parse(boat.photos || '[]') : []);
        const first = photos[0];
        const boatPhoto = typeof first === 'string' ? first : (first?.location || first?.url || first?.filename || '') || '';

        const durationMinutes = normalizeDurationToMinutes(hours);
        const { rows } = await pool.query(
            `INSERT INTO bookings (user_id, owner_id, boat_id, boat_title, boat_photo, start_at, hours, passengers, captain, total_price, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')
             RETURNING *`,
            [req.user.id, boat.owner_id, boat.id, boat.title, boatPhoto, start_at || new Date().toISOString(), durationMinutes, passengers || 1, !!captain, total_price || 0]
        );
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

router.get('/', authenticate, async (req, res, next) => {
    try {
        await pool.query(
            `UPDATE bookings SET status = 'completed'
             WHERE status = 'confirmed' AND start_at IS NOT NULL
             AND (start_at + (COALESCE(hours, 180)::int * interval '1 minute')) < NOW()`
        );
        const { rows } = await pool.query(
            `SELECT b.*, boat.location_city, boat.location_address, boat.location_yacht_club, boat.photos AS boat_photos
             FROM bookings b
             LEFT JOIN boats boat ON boat.id = b.boat_id
             WHERE b.user_id = $1
             ORDER BY b.created_at DESC`,
            [req.user.id]
        );
        res.json(rows.map(enrichBookingPhoto));
    } catch (err) {
        next(err);
    }
});

function enrichBookingPhoto(r) {
    let photo = r.boat_photo;
    if (!photo || String(photo).trim() === '') {
        const pics = r.boat_photos && Array.isArray(r.boat_photos) ? r.boat_photos : (typeof r.boat_photos === 'string' ? (() => { try { return JSON.parse(r.boat_photos || '[]'); } catch (_) { return []; } })() : []);
        const first = pics[0];
        photo = typeof first === 'string' ? first : (first?.location || first?.url || first?.filename || '') || '';
    }
    const { boat_photos, ...rest } = r;
    return { ...rest, boat_photo: photo };
}

router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT b.*, boat.location_city, boat.location_address, boat.location_yacht_club, boat.photos AS boat_photos
             FROM bookings b
             LEFT JOIN boats boat ON boat.id = b.boat_id
             WHERE b.id = $1 AND b.user_id = $2`,
            [parseInt(req.params.id, 10), req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(enrichBookingPhoto(rows[0]));
    } catch (err) {
        next(err);
    }
});

router.post('/:id/cancel', authenticate, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const userId = parseInt(req.user.id, 10);
        const { rows } = await pool.query(
            `UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND (user_id = $2 OR owner_id = $2) RETURNING *`,
            [id, userId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

router.patch('/:id', authenticate, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const ownerId = parseInt(req.user?.id, 10);
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
        if (hours != null) { updates.push(`hours = $${idx++}`); vals.push(normalizeDurationToMinutes(hours)); }
        if (updates.length === 0) return res.json(booking);
        vals.push(id, ownerId);
        const { rows } = await pool.query(
            `UPDATE bookings SET ${updates.join(', ')} WHERE id = $${idx} AND owner_id = $${idx + 1} RETURNING *`,
            vals
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
