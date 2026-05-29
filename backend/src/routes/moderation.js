const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const { createReport } = require('../utils/moderationHelpers');
const { sendUgcReportEmail } = require('../services/email');

const router = express.Router();

const REPORT_REASONS = new Set(['spam', 'harassment', 'fraud', 'other', 'user_blocked']);

router.use(authenticate);

router.get('/blocks', async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT blocked_user_id, created_at FROM user_blocks WHERE blocker_id = $1 ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

router.post('/reports', async (req, res, next) => {
    try {
        const body = req.body || {};
        const reportedUserId = parseInt(body.reported_user_id, 10);
        const contentType = String(body.content_type || 'user');
        const contentId = body.content_id != null ? parseInt(body.content_id, 10) : null;
        const reason = String(body.reason || 'other');
        const details = body.details || null;

        if (!reportedUserId || Number.isNaN(reportedUserId)) {
            return res.status(400).json({ error: 'Укажите reported_user_id' });
        }
        if (reportedUserId === req.user.id) {
            return res.status(400).json({ error: 'Нельзя пожаловаться на себя' });
        }
        if (!['message', 'user', 'review'].includes(contentType)) {
            return res.status(400).json({ error: 'Некорректный content_type' });
        }
        if (!REPORT_REASONS.has(reason)) {
            return res.status(400).json({ error: 'Некорректная причина жалобы' });
        }

        if (contentType === 'message' && contentId) {
            const { rows: msgRows } = await pool.query(
                `SELECT m.id, m.text, c.user_id, c.owner_id
                 FROM messages m
                 JOIN chats c ON c.id = m.chat_id
                 WHERE m.id = $1`,
                [contentId]
            );
            if (msgRows.length === 0) {
                return res.status(404).json({ error: 'Сообщение не найдено' });
            }
            const msg = msgRows[0];
            const uid = req.user.id;
            if (uid !== msg.user_id && uid !== msg.owner_id) {
                return res.status(403).json({ error: 'Нет доступа к этому сообщению' });
            }
        }

        const report = await createReport({
            reporterId: req.user.id,
            reportedUserId,
            contentType,
            contentId,
            reason,
            details,
        });

        sendUgcReportEmail(report).catch(() => {});

        res.status(201).json({ ok: true, report });
    } catch (err) {
        next(err);
    }
});

router.post('/users/:id/block', async (req, res, next) => {
    try {
        const blockedUserId = parseInt(req.params.id, 10);
        if (!blockedUserId || Number.isNaN(blockedUserId)) {
            return res.status(400).json({ error: 'Некорректный id пользователя' });
        }
        if (blockedUserId === req.user.id) {
            return res.status(400).json({ error: 'Нельзя заблокировать себя' });
        }

        const { rows: userRows } = await pool.query('SELECT id FROM users WHERE id = $1', [blockedUserId]);
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        await pool.query(
            `INSERT INTO user_blocks (blocker_id, blocked_user_id)
             VALUES ($1, $2)
             ON CONFLICT (blocker_id, blocked_user_id) DO NOTHING`,
            [req.user.id, blockedUserId]
        );

        const report = await createReport({
            reporterId: req.user.id,
            reportedUserId: blockedUserId,
            contentType: 'user',
            contentId: null,
            reason: 'user_blocked',
            details: 'Пользователь заблокирован через приложение',
        });
        sendUgcReportEmail(report).catch(() => {});

        res.status(201).json({ ok: true, blocked_user_id: blockedUserId });
    } catch (err) {
        next(err);
    }
});

router.delete('/users/:id/block', async (req, res, next) => {
    try {
        const blockedUserId = parseInt(req.params.id, 10);
        if (!blockedUserId || Number.isNaN(blockedUserId)) {
            return res.status(400).json({ error: 'Некорректный id пользователя' });
        }
        await pool.query(
            'DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_user_id = $2',
            [req.user.id, blockedUserId]
        );
        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

module.exports = router;
