const express = require('express');
const path = require('path');
const { pool } = require('../db');
const { authenticate, requireRole, optionalAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { processUploadedImages } = require('../middleware/imageProcessor');

const router = express.Router();

router.use(optionalAuth);

function getPhotoUrl(file) {
    if (!file) return null;
    if (file.location) return file.location;
    if (file.filename) return '/uploads/' + path.basename(file.filename);
    return null;
}

router.get('/', async (req, res, next) => {
    try {
        const { lat, lng, radius, popular, limit, region, city } = req.query;
        const user = req.user || null;

        let query, params;
        if (user && user.role === 'owner' && lat == null && lng == null && !popular && !region && !city) {
            query = 'SELECT * FROM boats WHERE status != $1 AND owner_id = $2 ORDER BY id';
            params = ['deleted', user.id];
        } else if (region && String(region).trim()) {
            const regionVal = String(region).trim();
            if (regionVal.toLowerCase() === 'московская область') {
                query = `SELECT * FROM boats WHERE status != 'deleted' AND LOWER(TRIM(COALESCE(location_region, ''))) = LOWER($1) AND LOWER(TRIM(COALESCE(location_city, ''))) != 'москва' ORDER BY COALESCE(bookings_count, 0) DESC, id`;
            } else {
                query = `SELECT * FROM boats WHERE status != 'deleted' AND LOWER(TRIM(COALESCE(location_region, ''))) = LOWER($1) ORDER BY COALESCE(bookings_count, 0) DESC, id`;
            }
            params = [regionVal];
        } else if (city && String(city).trim()) {
            const cityVal = String(city).trim();
            query = `SELECT * FROM boats WHERE status != 'deleted' AND LOWER(TRIM(COALESCE(location_city, ''))) = LOWER($1) ORDER BY COALESCE(bookings_count, 0) DESC, id`;
            params = [cityVal];
        } else if (popular) {
            const lim = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
            query = `SELECT * FROM boats WHERE status != 'deleted' ORDER BY COALESCE(bookings_count, 0) DESC, id LIMIT $1`;
            params = [lim];
        } else if (lat != null && lng != null) {
            const latF = parseFloat(lat);
            const lngF = parseFloat(lng);
            const rad = radius ? parseFloat(radius) : 50;
            query = `SELECT * FROM boats WHERE status != 'deleted' AND lat IS NOT NULL AND lng IS NOT NULL AND (|/ ((lat - $1)^2 + (lng - $2)^2)) * 111 <= $3 ORDER BY id`;
            params = [latF, lngF, rad];
        } else {
            query = `SELECT * FROM boats WHERE status != 'deleted' ORDER BY id`;
            params = [];
        }

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

router.get('/cities', async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT DISTINCT location_city AS city FROM boats WHERE location_city IS NOT NULL AND TRIM(COALESCE(location_city, '')) <> '' ORDER BY location_city`
        );
        res.json(rows.map((r) => (r?.city ? String(r.city).trim() : null)).filter(Boolean));
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const { rows } = await pool.query('SELECT * FROM boats WHERE id = $1', [parseInt(req.params.id, 10)]);
        if (rows.length === 0) return res.status(404).json({ error: 'Катер не найден' });
        const boat = rows[0];
        if (boat.owner_id && (!boat.owner_name || String(boat.owner_name).trim() === '')) {
            const { rows: userRows } = await pool.query('SELECT name FROM users WHERE id = $1', [boat.owner_id]);
            if (userRows.length > 0 && userRows[0].name) {
                boat.owner_name = userRows[0].name;
            }
        }
        res.json({
            manufacturer: '', model: '', year: '', location_country: '', location_region: '',
            location_address: '', location_yacht_club: '', rules: '', cancellation_policy: '',
            schedule_work_days: null, schedule_weekday_hours: null,
            schedule_weekend_hours: null, schedule_min_duration: 60,
            price_tiers: [], video_uris: [],
            ...boat,
        });
    } catch (err) {
        next(err);
    }
});

router.get('/:id/reviews', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rows } = await pool.query(
            `SELECT * FROM reviews WHERE boat_id = $1 AND (status = 'approved' OR status IS NULL) AND COALESCE(spam,false) = false ORDER BY created_at DESC`,
            [id]
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

router.post('/:id/reviews', authenticate, async (req, res, next) => {
    try {
        const boatId = parseInt(req.params.id, 10);
        if (Number.isNaN(boatId)) return res.status(400).json({ error: 'Неверный идентификатор катера' });

        const userId = parseInt(req.user.id, 10);
        if (Number.isNaN(userId)) return res.status(401).json({ error: 'Ошибка авторизации' });

        const { rating, text } = req.body || {};
        const r = Math.min(5, Math.max(1, parseInt(rating, 10) || 5));
        const textStr = typeof text === 'string' ? text.trim() : '';
        if (textStr.length < 20) {
            return res.status(400).json({ error: 'Текст отзыва должен быть не короче 20 символов' });
        }

        const userDisplayName = [req.user.name, req.user.first_name, req.user.last_name].filter(Boolean).join(' ').trim() || 'Гость';

        const { rows: boatRows } = await pool.query('SELECT id FROM boats WHERE id = $1', [boatId]);
        if (boatRows.length === 0) return res.status(404).json({ error: 'Катер не найден' });

        const { rows: existing } = await pool.query(
            'SELECT id, status FROM reviews WHERE boat_id = $1 AND user_id = $2',
            [boatId, userId]
        );
        const activeStatuses = ['approved', 'pending'];
        const isActive = existing.length > 0 && activeStatuses.includes((existing[0].status || '').toLowerCase());
        if (isActive) return res.status(400).json({ error: 'Вы уже оставили отзыв на этот катер' });

        const { rows: recent } = await pool.query(
            `SELECT COUNT(*) FROM reviews WHERE user_id = $1 AND created_at > NOW() - INTERVAL '5 minutes'`,
            [userId]
        );
        if (parseInt(recent[0].count, 10) > 0) {
            return res.status(429).json({ error: 'Вы слишком часто оставляете отзывы. Попробуйте чуть позже.' });
        }

        if (existing.length > 0) {
            // Отзыв был отклонён или удалён — обновляем запись и отправляем на модерацию снова
            const { rows: updated } = await pool.query(
                `UPDATE reviews SET user_name = $1, rating = $2, text = $3, status = 'pending', spam = false WHERE id = $4 RETURNING *`,
                [userDisplayName, r, textStr || null, existing[0].id]
            );
            return res.status(201).json({ ok: true, review: updated[0] });
        }

        const { rows: inserted } = await pool.query(
            'INSERT INTO reviews (boat_id, user_id, user_name, rating, text, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [boatId, userId, userDisplayName, r, textStr || null, 'pending']
        );

        res.status(201).json({ ok: true, review: inserted[0] });
    } catch (err) {
        console.error('POST /boats/:id/reviews error:', err.message || err);
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Катер или пользователь не найден' });
        }
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Вы уже оставили отзыв на этот катер' });
        }
        next(err);
    }
});

router.post('/', authenticate, requireRole(['owner']), upload.array('photos', 10), processUploadedImages, async (req, res, next) => {
    try {
        const body = req.body || {};
        const photoFiles = (req.files || []).map(getPhotoUrl);
        const photos = photoFiles.length ? photoFiles : ['https://placehold.co/400x300/png'];

        let amenities = [];
        if (body.amenities) {
            try { amenities = typeof body.amenities === 'string' ? JSON.parse(body.amenities) : body.amenities; } catch (_) {}
        }
        if (!Array.isArray(amenities)) amenities = [];

        const safeJson = (val, def) => {
            if (!val) return def;
            try {
                const parsed = typeof val === 'string' ? JSON.parse(val) : val;
                return typeof parsed === 'object' ? parsed : def;
            } catch (_) { return def; }
        };
        const scheduleWorkDays = safeJson(body.schedule_work_days, null);
        const scheduleWeekdayHours = safeJson(body.schedule_weekday_hours, null);
        const scheduleWeekendHours = safeJson(body.schedule_weekend_hours, null);
        const priceTiers = safeJson(body.price_tiers, '[]');
        const videoUris = safeJson(body.video_uris, '[]');

        const { rows } = await pool.query(`
            INSERT INTO boats (owner_id, owner_name, title, description, type_id, type_name, manufacturer, model, year, length_m, capacity, location_country, location_region, location_city, location_address, location_yacht_club, lat, lng, price_per_hour, price_per_day, captain_included, has_captain_option, rules, cancellation_policy, photos, amenities, schedule_work_days, schedule_weekday_hours, schedule_weekend_hours, schedule_min_duration, price_tiers, price_weekend, video_uris, status, rating, reviews_count, bookings_count)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37)
            RETURNING *
        `, [
            req.user.id, req.user.name, body.title || 'Без названия', body.description || '',
            body.type_id || '1', body.type_name || 'Катер', body.manufacturer || '', body.model || '',
            body.year || '', body.length_m || '', body.capacity || '0',
            body.location_country || '', body.location_region || '', body.location_city || 'Москва', body.location_address || '', body.location_yacht_club || '',
            parseFloat(body.lat) || 55.75, parseFloat(body.lng) || 37.62,
            body.price_per_hour || '0', body.price_per_day || '',
            body.captain_included === '1', body.has_captain_option === '1',
            body.rules || '', body.cancellation_policy || '',
            JSON.stringify(photos), JSON.stringify(amenities),
            scheduleWorkDays, scheduleWeekdayHours, scheduleWeekendHours,
            body.schedule_min_duration ? parseInt(body.schedule_min_duration, 10) : 60,
            typeof priceTiers === 'string' ? priceTiers : JSON.stringify(priceTiers),
            body.price_weekend !== undefined ? String(body.price_weekend).trim() : '',
            typeof videoUris === 'string' ? videoUris : JSON.stringify(videoUris),
            'moderation', 0, 0, 0,
        ]);

        res.status(201).json(rows[0]);
    } catch (err) {
        next(err);
    }
});

router.patch('/:id', authenticate, requireRole(['owner']), (req, res, next) => {
    upload.array('photos', 10)(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'Ошибка загрузки файлов' });
        }
        processUploadedImages(req, res, next);
    });
}, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rows: existing } = await pool.query('SELECT * FROM boats WHERE id = $1', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Катер не найден' });
        const boat = existing[0];
        if (boat.owner_id !== req.user.id) return res.status(403).json({ error: 'Нет прав на редактирование' });

        const body = req.body || {};
        let existingPhotos = boat.photos || [];
        if (body.photo_urls) {
            try { existingPhotos = JSON.parse(body.photo_urls); } catch (_) {}
        }
        if (!Array.isArray(existingPhotos)) existingPhotos = [];
        const newFiles = (req.files || []).map(getPhotoUrl).filter(Boolean);
        const combinedPhotos = [...existingPhotos, ...newFiles];

        const sets = [];
        const vals = [];
        let idx = 1;
        const textFields = ['title', 'description', 'type_id', 'type_name', 'manufacturer', 'model', 'year', 'length_m', 'capacity', 'location_country', 'location_region', 'location_city', 'location_address', 'location_yacht_club', 'price_per_hour', 'price_per_day', 'price_weekend', 'rules', 'cancellation_policy'];
        for (const f of textFields) {
            if (body[f] !== undefined) {
                sets.push(`${f} = $${idx++}`);
                vals.push(body[f]);
            }
        }
        if (body.lat !== undefined) { sets.push(`lat = $${idx++}`); vals.push(parseFloat(body.lat) || boat.lat); }
        if (body.lng !== undefined) { sets.push(`lng = $${idx++}`); vals.push(parseFloat(body.lng) || boat.lng); }
        if (body.captain_included !== undefined) { sets.push(`captain_included = $${idx++}`); vals.push(body.captain_included === '1' || body.captain_included === true); }
        if (body.has_captain_option !== undefined) { sets.push(`has_captain_option = $${idx++}`); vals.push(body.has_captain_option === '1' || body.has_captain_option === true); }
        if (combinedPhotos.length > 0) {
            sets.push(`photos = $${idx++}`);
            vals.push(JSON.stringify(combinedPhotos));
        }
        if (body.amenities !== undefined) {
            let am = [];
            try { am = typeof body.amenities === 'string' ? JSON.parse(body.amenities) : body.amenities; } catch (_) {}
            if (!Array.isArray(am)) am = [];
            sets.push(`amenities = $${idx++}`);
            vals.push(JSON.stringify(am));
        }
        const jsonFields = ['schedule_work_days', 'schedule_weekday_hours', 'schedule_weekend_hours', 'price_tiers', 'video_uris'];
        for (const f of jsonFields) {
            if (body[f] !== undefined) {
                sets.push(`${f} = $${idx++}`);
                let parsed = body[f];
                if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch (_) {} }
                vals.push(JSON.stringify(parsed));
            }
        }
        if (body.schedule_min_duration !== undefined) {
            sets.push(`schedule_min_duration = $${idx++}`);
            vals.push(parseInt(body.schedule_min_duration, 10) || boat.schedule_min_duration);
        }
        sets.push(`owner_name = $${idx++}`);
        vals.push(req.user.name || boat.owner_name || '');

        if (sets.length === 0) return res.json(boat);

        vals.push(id);
        const { rows } = await pool.query(`UPDATE boats SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
        res.json(rows[0]);
    } catch (err) {
        console.error('PATCH /boats/:id error', err.message, err.stack);
        const msg = err.message || 'Внутренняя ошибка сервера';
        return res.status(500).json({ error: 'Не удалось сохранить', message: msg });
    }
});

router.delete('/:id', authenticate, requireRole(['owner']), async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rows } = await pool.query('SELECT * FROM boats WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Катер не найден' });
        if (rows[0].owner_id !== req.user.id) return res.status(403).json({ error: 'Нет прав на удаление' });

        const { rows: active } = await pool.query(
            `SELECT COUNT(*) FROM bookings WHERE boat_id = $1 AND status IN ('confirmed','pending')`,
            [id]
        );
        if (parseInt(active[0].count, 10) > 0) {
            return res.status(400).json({ error: 'Невозможно удалить катер с активными бронированиями.' });
        }

        await pool.query(`UPDATE boats SET status = 'deleted' WHERE id = $1`, [id]);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
