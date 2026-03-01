const express = require('express');
const { pool } = require('../db');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { boatCreateSchema, boatSearchSchema } = require('../schemas');

const router = express.Router();

// ПОИСК (с использованием PostGIS ST_DWithin)
router.get('/', validate(boatSearchSchema), async (req, res, next) => {
    try {
        const {
            lat, lng, radius, city, type_id,
            min_price, max_price, capacity,
            limit, offset
        } = req.query;

        let query = `
      SELECT id, title, description, capacity, price_per_hour, price_per_day,
             location_city, photos, rating, reviews_count
      FROM boats
      WHERE status = 'active'
    `;
        const params = [];
        let paramIndex = 1;

        // Временный гео-поиск без PostGIS (очень грубый расчет по градусам)
        if (lat && lng) {
            // 1 градус ~ 111 км. Радиус в км делим на 111
            const radiusDeg = (radius || 50) / 111;
            query += ` AND POWER(lat - $${paramIndex}, 2) + POWER(lng - $${paramIndex + 1}, 2) <= POWER($${paramIndex + 2}, 2)`;
            params.push(lat, lng, radiusDeg);
            paramIndex += 3;
        }

        if (city) {
            query += ` AND location_city ILIKE $${paramIndex}`;
            params.push(`%${city}%`);
            paramIndex++;
        }

        if (type_id) {
            query += ` AND type_id = $${paramIndex}`;
            params.push(type_id);
            paramIndex++;
        }

        if (capacity) {
            query += ` AND capacity >= $${paramIndex}`;
            params.push(capacity);
            paramIndex++;
        }

        query += ` ORDER BY rating DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit || 20, offset || 0);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

// СОЗДАНИЕ (Только Owner)
router.post('/', authenticate, requireRole(['owner', 'admin']), upload.array('photos', 10), validate(boatCreateSchema), async (req, res, next) => {
    try {
        const {
            title, description, year, length_m, capacity,
            location_city, location_address, lat, lng, type_id,
            price_per_hour, price_per_day, captain_included, has_captain_option, rules
        } = req.body;

        // Сбор ссылок на загруженные в S3 фотографии
        const photoUrls = req.files ? req.files.map(file => file.location) : [];

        const result = await pool.query(`
      INSERT INTO boats (
        owner_id, type_id, title, description, year, length_m, capacity,
        location_city, location_address, lat, lng, price_per_hour, price_per_day,
        captain_included, has_captain_option, rules, photos, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17, 'moderation'
      ) RETURNING id, title, status, photos
    `, [
            req.user.id, type_id, title, description, year, length_m, capacity,
            location_city, location_address, lat, lng,
            price_per_hour, price_per_day, captain_included, has_captain_option,
            rules, JSON.stringify(photoUrls)
        ]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

// СПИСОК ГОРОДОВ С КАТЕРАМИ
router.get('/cities', async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT DISTINCT location_city AS city FROM boats 
             WHERE location_city IS NOT NULL 
             AND TRIM(COALESCE(location_city, '')) <> ''
             ORDER BY location_city`,
        );
        res.json(result.rows.map((r) => (r?.city ? String(r.city).trim() : null)).filter(Boolean));
    } catch (err) {
        next(err);
    }
});

// ДЕТАЛИ КАЕТРА
router.get('/:id', async (req, res, next) => {
    try {
        const result = await pool.query(`
      SELECT b.*, u.name as owner_name, u.avatar as owner_avatar
      FROM boats b
      JOIN users u ON b.owner_id = u.id
      WHERE b.id = $1
    `, [req.params.id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Катер не найден' });
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

// Приведение типов из form/multipart для PATCH
function parseBoatBody(body) {
    const out = { ...body };
    if (out.year !== undefined && out.year !== '') out.year = parseInt(out.year, 10) || null;
    if (out.length_m !== undefined && out.length_m !== '') out.length_m = parseFloat(out.length_m) || null;
    if (out.capacity !== undefined && out.capacity !== '') out.capacity = parseInt(out.capacity, 10) || null;
    if (out.lat !== undefined && out.lat !== '') out.lat = parseFloat(out.lat) || null;
    if (out.lng !== undefined && out.lng !== '') out.lng = parseFloat(out.lng) || null;
    if (out.type_id !== undefined && out.type_id !== '') out.type_id = parseInt(out.type_id, 10) || null;
    if (out.price_per_hour !== undefined && out.price_per_hour !== '') out.price_per_hour = parseFloat(out.price_per_hour) || null;
    if (out.price_per_day !== undefined && out.price_per_day !== '') out.price_per_day = parseFloat(out.price_per_day) || null;
    if (out.captain_included !== undefined) out.captain_included = out.captain_included === '1' || out.captain_included === true;
    if (out.has_captain_option !== undefined) out.has_captain_option = out.has_captain_option === '1' || out.has_captain_option === true;
    return out;
}

// ОБНОВЛЕНИЕ КАТЕРА (только владелец): добавление/замена фото и полей
router.patch('/:id', authenticate, requireRole(['owner', 'admin']), upload.array('photos', 10), async (req, res, next) => {
    try {
        const boatId = req.params.id;
        const check = await pool.query('SELECT id, owner_id, photos FROM boats WHERE id = $1', [boatId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Катер не найден' });
        if (check.rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Нет прав на редактирование' });
        }

        let existingPhotos = check.rows[0].photos || [];
        if (req.body.photo_urls !== undefined && req.body.photo_urls !== '') {
            try {
                existingPhotos = JSON.parse(req.body.photo_urls);
            } catch (_) {}
        }
        if (!Array.isArray(existingPhotos)) existingPhotos = [];
        const newUrls = req.files ? req.files.map(f => f.location) : [];
        const photos = [...existingPhotos, ...newUrls];

        const body = parseBoatBody(req.body);
        const updates = [];
        const params = [];
        let paramIndex = 1;
        const fields = [
            'title', 'description', 'year', 'length_m', 'capacity', 'location_city', 'location_address',
            'lat', 'lng', 'type_id', 'price_per_hour', 'price_per_day', 'captain_included', 'has_captain_option', 'rules', 'amenities'
        ];
        fields.forEach(f => {
            if (body[f] !== undefined) {
                updates.push(`${f} = $${paramIndex}`);
                params.push(f === 'amenities' ? (typeof body[f] === 'string' ? body[f] : JSON.stringify(body[f] || [])) : body[f]);
                paramIndex++;
            }
        });
        updates.push(`photos = $${paramIndex}`);
        params.push(JSON.stringify(photos));
        paramIndex++;

        params.push(boatId);
        const result = await pool.query(
            `UPDATE boats SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, title, photos, status`,
            params
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('PATCH /boats/:id error', err);
        res.status(500).json({ error: err.message || 'Не удалось сохранить' });
    }
});

module.exports = router;
