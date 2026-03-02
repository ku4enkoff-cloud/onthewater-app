const express = require('express');
const path = require('path');
const { pool } = require('../db');
const { authenticate, adminMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();
const DEFAULT = [
    ['Москва', 'https://images.unsplash.com/photo-1513326738677-9646ab0f3b3b?w=400', 0],
    ['Санкт-Петербург', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', 1],
    ['Сочи', 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=400', 2],
    ['Крым', 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400', 3],
    ['Казань', 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=400', 4],
];

router.get('/', async (req, res, next) => {
    try {
        let { rows } = await pool.query('SELECT id, name, image, sort_order FROM destinations ORDER BY sort_order ASC, id ASC');
        if (rows.length === 0) {
            for (const [name, image, sort_order] of DEFAULT) {
                await pool.query('INSERT INTO destinations (name, image, sort_order) VALUES ($1, $2, $3)', [name, image, sort_order]);
            }
            const r = await pool.query('SELECT id, name, image, sort_order FROM destinations ORDER BY sort_order ASC, id ASC');
            rows = r.rows;
        }
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

router.get('/admin', authenticate, adminMiddleware, async (req, res, next) => {
    try {
        let { rows } = await pool.query('SELECT * FROM destinations ORDER BY sort_order ASC, id ASC');
        if (rows.length === 0) {
            for (const [name, image, sort_order] of DEFAULT) {
                await pool.query('INSERT INTO destinations (name, image, sort_order) VALUES ($1, $2, $3)', [name, image, sort_order]);
            }
            const r = await pool.query('SELECT * FROM destinations ORDER BY sort_order ASC, id ASC');
            rows = r.rows;
        }
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

function getImage(req) {
    if (req.file && req.file.location) return req.file.location;
    if (req.file && req.file.filename) return '/uploads/' + path.basename(req.file.filename);
    return '';
}

router.post('/admin', authenticate, adminMiddleware, upload.single('photo'), async (req, res, next) => {
    try {
        const name = (req.body?.name != null) ? String(req.body.name).trim() : '';
        if (!name) return res.status(400).json({ error: 'Укажите название направления' });
        const image = getImage(req);
        const { rows } = await pool.query(
            'INSERT INTO destinations (name, image, sort_order) VALUES ($1, $2, COALESCE((SELECT MAX(sort_order) FROM destinations), 0) + 1) RETURNING *',
            [name, image]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        next(err);
    }
});

router.put('/admin/:id', authenticate, adminMiddleware, upload.single('photo'), async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rows: existing } = await pool.query('SELECT * FROM destinations WHERE id = $1', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Направление не найдено' });
        const name = (req.body?.name !== undefined && req.body?.name !== null) ? String(req.body.name).trim() : (existing[0].name || '');
        let image = existing[0].image || '';
        if (req.file) image = getImage(req) || image;
        await pool.query('UPDATE destinations SET name = $1, image = $2 WHERE id = $3', [name, image || '', id]);
        const { rows } = await pool.query('SELECT * FROM destinations WHERE id = $1', [id]);
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

router.delete('/admin/:id', authenticate, adminMiddleware, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rowCount } = await pool.query('DELETE FROM destinations WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Направление не найдено' });
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

router.patch('/admin/reorder', authenticate, adminMiddleware, async (req, res, next) => {
    try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x) => parseInt(x, 10)).filter((x) => !isNaN(x)) : [];
        if (ids.length === 0) return res.status(400).json({ error: 'Укажите порядок направлений' });
        for (let i = 0; i < ids.length; i++) {
            await pool.query('UPDATE destinations SET sort_order = $1 WHERE id = $2', [i, ids[i]]);
        }
        const { rows } = await pool.query('SELECT * FROM destinations ORDER BY sort_order ASC, id ASC');
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
