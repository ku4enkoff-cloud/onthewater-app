const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/bookings', authenticate, async (req, res, next) => {
    try {
        const { rows: rawRows } = await pool.query(
            `SELECT b.*, boat.schedule_work_days as boat_schedule_work_days
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
                usersMap[u.id] = displayName || null;
            });
        }
        const rows = rawRows.map((b) => {
            const { boat_schedule_work_days, ...rest } = b;
            return { ...rest, client_name: usersMap[b.user_id] || null, schedule_work_days: boat_schedule_work_days };
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
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

router.post('/bookings/:id/decline', authenticate, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            'DELETE FROM bookings WHERE id = $1 AND owner_id = $2 RETURNING id',
            [parseInt(req.params.id, 10), req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

router.get('/chats', authenticate, async (req, res, next) => {
    try {
        const { rows } = await pool.query('SELECT * FROM chats WHERE owner_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
