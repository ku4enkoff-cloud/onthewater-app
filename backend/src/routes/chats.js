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

router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM chats WHERE id = $1 AND (user_id = $2 OR owner_id = $2)',
            [parseInt(req.params.id, 10), req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

router.get('/:id/messages', authenticate, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at',
            [parseInt(req.params.id, 10)]
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
