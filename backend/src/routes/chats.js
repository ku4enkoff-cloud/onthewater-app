const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
    try {
        const { rows } = await pool.query('SELECT * FROM chats WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// Получить или создать чат с владельцем катера (для кнопки «Написать владельцу»)
router.post('/', authenticate, async (req, res, next) => {
    try {
        const boatId = parseInt(req.body && req.body.boat_id, 10);
        if (!boatId || Number.isNaN(boatId)) {
            return res.status(400).json({ error: 'Укажите boat_id' });
        }
        const userId = req.user.id;
        const { rows: boatRows } = await pool.query(
            'SELECT id, owner_id, title FROM boats WHERE id = $1 AND status != $2',
            [boatId, 'deleted']
        );
        if (boatRows.length === 0) {
            return res.status(404).json({ error: 'Катер не найден' });
        }
        const boat = boatRows[0];
        const ownerId = boat.owner_id;
        if (userId === ownerId) {
            return res.status(400).json({ error: 'Нельзя создать чат с самим собой' });
        }
        let { rows: existing } = await pool.query(
            'SELECT * FROM chats WHERE user_id = $1 AND boat_id = $2 LIMIT 1',
            [userId, boatId]
        );
        if (existing.length > 0) {
            return res.status(200).json(existing[0]);
        }
        const { rows: ownerRows } = await pool.query(
            'SELECT name FROM users WHERE id = $1',
            [ownerId]
        );
        const ownerName = ownerRows[0] && ownerRows[0].name ? ownerRows[0].name : 'Владелец';
        const userName = req.user.name || req.user.email || 'Гость';
        const { rows: inserted } = await pool.query(
            `INSERT INTO chats (user_id, owner_id, boat_id, boat_title, user_name, owner_name)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [userId, ownerId, boatId, boat.title || '', userName, ownerName]
        );
        res.status(201).json(inserted[0]);
    } catch (err) {
        next(err);
    }
});

router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ error: 'Неверный id чата' });
        const { rows } = await pool.query(
            'SELECT * FROM chats WHERE id = $1 AND (user_id = $2 OR owner_id = $2)',
            [id, req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

router.get('/:id/messages', authenticate, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ error: 'Неверный id чата' });
        const { rows } = await pool.query(
            'SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at',
            [id]
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

router.post('/:id/messages', authenticate, async (req, res, next) => {
    try {
        const chatId = parseInt(req.params.id, 10);
        const { rows: chatRows } = await pool.query('SELECT * FROM chats WHERE id = $1', [chatId]);
        if (chatRows.length === 0) return res.status(404).json({ error: 'Not found' });
        const text = (req.body && req.body.text) || '';
        const sender = req.user.role === 'owner' ? 'owner' : 'me';

        const { rows } = await pool.query(
            `INSERT INTO messages (chat_id, text, sender, is_own) VALUES ($1, $2, $3, $4) RETURNING *`,
            [chatId, text, sender, true]
        );
        await pool.query('UPDATE chats SET last_message = $1 WHERE id = $2', [text, chatId]);
        res.status(201).json(rows[0]);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
