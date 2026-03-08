const express = require('express');
const path = require('path');
const { pool } = require('../db');
const { authenticate, adminMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();
const DEFAULT = [
    ['Парусная яхта', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400', 0],
    ['Яхта', 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=400', 1],
    ['Понтон', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400', 2],
    ['Катер', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400', 3],
    ['Буксировщик', 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=400', 4],
    ['Гидроцикл', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400', 5],
];

router.get('/', async (req, res, next) => {
    try {
        let { rows } = await pool.query('SELECT id, name, image, sort_order, icon FROM boat_types ORDER BY sort_order ASC, id ASC');
        if (rows.length === 0) {
            for (const [n, i, s] of DEFAULT) {
                await pool.query('INSERT INTO boat_types (name, image, sort_order) VALUES ($1, $2, $3)', [n, i, s]);
            }
            const r = await pool.query('SELECT id, name, image, sort_order, icon FROM boat_types ORDER BY sort_order ASC, id ASC');
            rows = r.rows;
        }
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

function img(req) {
    if (req.file && req.file.location) return req.file.location;
    if (req.file && req.file.filename) return '/uploads/' + path.basename(req.file.filename);
    return '';
}

router.get('/admin', authenticate, adminMiddleware, async (req, res, next) => {
    try {
        let { rows } = await pool.query('SELECT * FROM boat_types ORDER BY sort_order ASC, id ASC');
        if (rows.length === 0) {
            for (const [n, i, s] of DEFAULT) {
                await pool.query('INSERT INTO boat_types (name, image, sort_order) VALUES ($1, $2, $3)', [n, i, s]);
            }
            const r = await pool.query('SELECT * FROM boat_types ORDER BY sort_order ASC, id ASC');
            rows = r.rows;
        }
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

router.post('/admin', authenticate, adminMiddleware, upload.single('photo'), async (req, res, next) => {
    try {
        const name = (req.body?.name != null) ? String(req.body.name).trim() : '';
        if (!name) return res.status(400).json({ error: 'Укажите название типа' });
        const { rows } = await pool.query(
            'INSERT INTO boat_types (name, image, sort_order) VALUES ($1, $2, COALESCE((SELECT MAX(sort_order) FROM boat_types), 0) + 1) RETURNING *',
            [name, img(req)]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        next(err);
    }
});

router.put('/admin/:id', authenticate, adminMiddleware, upload.single('photo'), async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rows: ex } = await pool.query('SELECT * FROM boat_types WHERE id = $1', [id]);
        if (ex.length === 0) return res.status(404).json({ error: 'Тип не найден' });
        const name = (req.body?.name != null) ? String(req.body.name).trim() : (ex[0].name || '');
        const image = req.file ? img(req) || ex[0].image : ex[0].image;
        await pool.query('UPDATE boat_types SET name = $1, image = $2 WHERE id = $3', [name, image || '', id]);
        const { rows } = await pool.query('SELECT * FROM boat_types WHERE id = $1', [id]);
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

router.delete('/admin/:id', authenticate, adminMiddleware, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rowCount } = await pool.query('DELETE FROM boat_types WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Тип не найден' });
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

router.patch('/admin/reorder', authenticate, adminMiddleware, async (req, res, next) => {
    try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x) => parseInt(x, 10)).filter((x) => !isNaN(x)) : [];
        if (ids.length === 0) return res.status(400).json({ error: 'Укажите порядок типов' });
        for (let i = 0; i < ids.length; i++) await pool.query('UPDATE boat_types SET sort_order = $1 WHERE id = $2', [i, ids[i]]);
        const { rows } = await pool.query('SELECT * FROM boat_types ORDER BY sort_order ASC, id ASC');
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
