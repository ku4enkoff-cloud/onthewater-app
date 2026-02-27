const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Получить список диалогов (по факту список пользователей, с которыми была переписка)
router.get('/conversations', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.id;
        // Сложный, но эффективный запрос для получения последних сообщений с каждым контактом
        const query = `
      SELECT 
        u.id as contact_id, 
        u.name, 
        u.avatar, 
        m.text as last_message, 
        m.created_at,
        m.read
      FROM users u
      JOIN messages m ON (u.id = m.sender_id OR u.id = m.receiver_id)
      WHERE u.id != $1 AND (m.sender_id = $1 OR m.receiver_id = $1)
        AND m.id IN (
          SELECT MAX(id) FROM messages 
          WHERE sender_id = $1 OR receiver_id = $1
          GROUP BY GREATEST(sender_id, receiver_id), LEAST(sender_id, receiver_id)
        )
      ORDER BY m.created_at DESC
    `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

// Получить историю сообщений с конкретным пользователем
router.get('/:contactId', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const contactId = req.params.contactId;

        const result = await pool.query(`
      SELECT id, sender_id, receiver_id, text, read, created_at
      FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
    `, [userId, contactId]);

        // Помечаем как прочитанные
        await pool.query(`
      UPDATE messages SET read = true 
      WHERE receiver_id = $1 AND sender_id = $2 AND read = false
    `, [userId, contactId]);

        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
