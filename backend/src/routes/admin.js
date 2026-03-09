const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { authenticate, adminMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { processUploadedImages } = require('../middleware/imageProcessor');

const router = express.Router();
router.use(authenticate);
router.use(adminMiddleware);

function getPhotoUrl(file) {
    if (file && file.location) return file.location;
    if (file && file.filename) return '/uploads/' + path.basename(file.filename);
    return '';
}

router.get('/users', async (req, res, next) => {
    try {
        const { rows } = await pool.query('SELECT id, email, name, first_name, last_name, phone, role, created_at FROM users ORDER BY id');
        res.json(rows.map((u) => ({ ...u, password_hash: undefined })));
    } catch (err) {
        next(err);
    }
});

router.get('/boats', async (req, res, next) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM boats WHERE status != 'deleted' ORDER BY id`);
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

router.get('/reviews', async (req, res, next) => {
    try {
        const { status = 'pending' } = req.query || {};
        const { rows } = await pool.query(
            `SELECT r.*, b.title AS boat_title
             FROM reviews r
             LEFT JOIN boats b ON b.id = r.boat_id
             WHERE ($1::text IS NULL OR r.status = $1)
             ORDER BY r.created_at DESC
             LIMIT 200`,
            [status || null]
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

router.patch('/reviews/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { status, spam } = req.body || {};
        const sets = [];
        const vals = [];
        let idx = 1;
        if (status) {
            sets.push(`status = $${idx++}`);
            vals.push(status);
        }
        if (spam !== undefined) {
            sets.push(`spam = $${idx++}`);
            vals.push(!!spam);
        }
        if (sets.length === 0) {
            const { rows } = await pool.query('SELECT * FROM reviews WHERE id = $1', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Отзыв не найден' });
            return res.json(rows[0]);
        }
        vals.push(id);
        const { rows } = await pool.query(
            `UPDATE reviews SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
            vals
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Отзыв не найден' });

        const review = rows[0];
        // При любом изменении отзыва пересчитываем рейтинг и количество отзывов катера
        await pool.query(
            `UPDATE boats
             SET rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE boat_id = $1 AND status = 'approved' AND COALESCE(spam,false) = false), 0),
                 reviews_count = COALESCE((SELECT COUNT(*)::int FROM reviews WHERE boat_id = $1 AND status = 'approved' AND COALESCE(spam,false) = false), 0)
             WHERE id = $1`,
            [review.boat_id]
        );

        res.json(review);
    } catch (err) {
        next(err);
    }
});

router.delete('/reviews/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rows } = await pool.query('SELECT boat_id FROM reviews WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Отзыв не найден' });
        const boatId = rows[0].boat_id;

        await pool.query('DELETE FROM reviews WHERE id = $1', [id]);

        await pool.query(
            `UPDATE boats
             SET rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE boat_id = $1 AND status = 'approved' AND COALESCE(spam,false) = false), 0),
                 reviews_count = COALESCE((SELECT COUNT(*)::int FROM reviews WHERE boat_id = $1 AND status = 'approved' AND COALESCE(spam,false) = false), 0)
             WHERE id = $1`,
            [boatId]
        );

        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

router.patch('/boats/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { status } = req.body || {};
        if (status !== undefined) {
            const { rows } = await pool.query('UPDATE boats SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Катер не найден' });
            return res.json(rows[0]);
        }
        const { rows } = await pool.query('SELECT * FROM boats WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Катер не найден' });
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

router.put('/boats/:id', upload.array('photos', 10), processUploadedImages, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rows: existing } = await pool.query('SELECT * FROM boats WHERE id = $1', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Катер не найден' });
        const boat = existing[0];
        const body = req.body || {};

        const sets = [];
        const vals = [];
        let idx = 1;

        if (body.photo_urls !== undefined || (req.files && req.files.length > 0)) {
            let ep = [];
            try { ep = JSON.parse(body.photo_urls || '[]'); } catch (_) {}
            if (!Array.isArray(ep)) ep = [];
            const newPaths = (req.files || []).map((f) => (f.location ? f.location : '/uploads/' + path.basename(f.filename)));
            const combined = [...ep, ...newPaths];
            const finalPhotos = combined.length ? combined : (boat.photos && boat.photos.length ? boat.photos : ['https://placehold.co/400x300?text=No+photo']);
            sets.push(`photos = $${idx++}`);
            vals.push(JSON.stringify(finalPhotos));
        }

        const textFields = ['title', 'description', 'type_id', 'type_name', 'manufacturer', 'model', 'year', 'length_m', 'capacity', 'location_country', 'location_region', 'location_city', 'location_address', 'location_yacht_club', 'price_per_hour', 'price_per_day', 'price_weekend', 'rules', 'cancellation_policy', 'status'];
        for (const f of textFields) {
            if (body[f] !== undefined) { sets.push(`${f} = $${idx++}`); vals.push(body[f]); }
        }
        if (body.lat !== undefined) { sets.push(`lat = $${idx++}`); vals.push(parseFloat(body.lat) || boat.lat); }
        if (body.lng !== undefined) { sets.push(`lng = $${idx++}`); vals.push(parseFloat(body.lng) || boat.lng); }
        if (body.captain_included !== undefined) { sets.push(`captain_included = $${idx++}`); vals.push(body.captain_included === true || body.captain_included === '1' || body.captain_included === 'true'); }
        if (body.has_captain_option !== undefined) { sets.push(`has_captain_option = $${idx++}`); vals.push(body.has_captain_option === true || body.has_captain_option === '1' || body.has_captain_option === 'true'); }
        if (body.instant_booking !== undefined) { sets.push(`instant_booking = $${idx++}`); vals.push(body.instant_booking === true || body.instant_booking === '1' || body.instant_booking === 'true'); }
        if (body.amenities !== undefined) {
            let am = [];
            try { am = typeof body.amenities === 'string' ? JSON.parse(body.amenities || '[]') : (body.amenities || []); } catch (_) {}
            sets.push(`amenities = $${idx++}`);
            vals.push(JSON.stringify(am));
        }
        const jsonFields = ['schedule_work_days', 'schedule_weekday_hours', 'schedule_weekend_hours', 'price_tiers', 'video_uris'];
        for (const f of jsonFields) {
            if (body[f] !== undefined) {
                sets.push(`${f} = $${idx++}`);
                let parsed = body[f];
                if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch (_) { parsed = []; } }
                vals.push(JSON.stringify(parsed || []));
            }
        }
        if (body.schedule_min_duration !== undefined) {
            sets.push(`schedule_min_duration = $${idx++}`);
            vals.push(parseInt(body.schedule_min_duration, 10) || boat.schedule_min_duration || 60);
        }

        if (sets.length === 0) return res.json(boat);

        vals.push(id);
        const { rows } = await pool.query(`UPDATE boats SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

router.get('/bookings', async (req, res, next) => {
    try {
        const { rows: rawRows } = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
        const userIds = [...new Set([...rawRows.map((r) => r.user_id), ...rawRows.map((r) => r.owner_id)])].filter(Boolean);
        const usersMap = {};
        if (userIds.length > 0) {
            const { rows: userRows } = await pool.query(
                'SELECT id, name, first_name, last_name, email, phone FROM users WHERE id = ANY($1)',
                [userIds]
            );
            userRows.forEach((u) => {
                const displayName = (u.name && String(u.name).trim()) || (u.first_name || u.last_name ? [u.first_name, u.last_name].filter(Boolean).join(' ').trim() : null) || u.email;
                usersMap[u.id] = { name: displayName || null, phone: (u.phone && String(u.phone).trim()) || null };
            });
        }
        const boatIds = [...new Set(rawRows.map((r) => r.boat_id).filter(Boolean))];
        const boatsMap = {};
        if (boatIds.length > 0) {
            const { rows: boatRows } = await pool.query('SELECT id, title FROM boats WHERE id = ANY($1)', [boatIds]);
            boatRows.forEach((b) => { boatsMap[b.id] = b.title; });
        }
        const rows = rawRows.map((b) => {
            const client = usersMap[b.user_id];
            const owner = usersMap[b.owner_id];
            return {
                ...b,
                client_name: (client && client.name) || null,
                client_phone: (client && client.phone) || null,
                owner_name: (owner && owner.name) || null,
                owner_phone: (owner && owner.phone) || null,
                boat_title_display: boatsMap[b.boat_id] || b.boat_title || null,
            };
        });
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

router.patch('/bookings/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { status, start_at, end_at } = req.body || {};
        const sets = [];
        const vals = [];
        let idx = 1;
        if (status !== undefined) { sets.push(`status = $${idx++}`); vals.push(status); }
        if (start_at !== undefined) { sets.push(`start_at = $${idx++}`); vals.push(start_at); }
        if (end_at !== undefined) { sets.push(`end_at = $${idx++}`); vals.push(end_at); }

        if (sets.length === 0) {
            const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Бронирование не найдено' });
            return res.json(rows[0]);
        }
        vals.push(id);
        const { rows } = await pool.query(`UPDATE bookings SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
        if (rows.length === 0) return res.status(404).json({ error: 'Бронирование не найдено' });
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

function slugFromName(name) {
    const tr = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
    const s = String(name || '').toLowerCase().trim();
    let out = '';
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (tr[c]) out += tr[c];
        else if (/[a-z0-9]/.test(c)) out += c;
        else if (/\s/.test(c)) out += '-';
    }
    return out.replace(/-+/g, '-').replace(/^-|-$/g, '') || 'type-' + Date.now();
}

router.get('/boat-types', async (req, res, next) => {
    try {
        let { rows } = await pool.query('SELECT * FROM boat_types ORDER BY sort_order ASC, id ASC');
        if (rows.length === 0) {
            const def = [['Парусная яхта','https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',0,'sailboat'],['Яхта','https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=400',1,'anchor'],['Понтон','https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400',2,'layers'],['Катер','https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',3,'ship'],['Буксировщик','https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=400',4,'waves'],['Гидроцикл','https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400',5,'zap']];
            for (const [n,i,s,ic] of def) await pool.query('INSERT INTO boat_types (name, slug, image, sort_order, icon) VALUES ($1,$2,$3,$4,$5)', [n, slugFromName(n), i, s, ic || 'ship']);
            const r = await pool.query('SELECT * FROM boat_types ORDER BY sort_order ASC, id ASC');
            rows = r.rows;
        }
        res.json(rows);
    } catch (err) { next(err); }
});

const boatTypeUpload = upload.fields([{ name: 'photo', maxCount: 1 }]);

router.post('/boat-types', boatTypeUpload, async (req, res, next) => {
    try {
        const name = (req.body?.name != null) ? String(req.body.name).trim() : '';
        if (!name) return res.status(400).json({ error: 'Укажите название типа' });
        const slug = slugFromName(name);
        const icon = (req.body?.icon != null && String(req.body.icon).trim()) ? String(req.body.icon).trim() : 'ship';
        const file = req.files?.photo?.[0];
        const image = (file && (file.location || file.filename)) ? (file.location || '/uploads/' + path.basename(file.filename)) : '';
        const { rows } = await pool.query('INSERT INTO boat_types (name, slug, image, sort_order, icon) VALUES ($1,$2,$3,COALESCE((SELECT MAX(sort_order) FROM boat_types),0)+1,$4) RETURNING *', [name, slug, image, icon]);
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('[POST /admin/boat-types]', err);
        next(err);
    }
});

router.put('/boat-types/:id', boatTypeUpload, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rows: ex } = await pool.query('SELECT * FROM boat_types WHERE id = $1', [id]);
        if (ex.length === 0) return res.status(404).json({ error: 'Тип не найден' });
        const name = (req.body?.name != null) ? String(req.body.name).trim() : (ex[0].name || '');
        const slug = slugFromName(name);
        const icon = (req.body?.icon != null && String(req.body.icon).trim()) ? String(req.body.icon).trim() : (ex[0].icon || 'ship');
        const file = req.files?.photo?.[0];
        let image = ex[0].image || '';
        if (file) image = file.location || '/uploads/' + path.basename(file.filename) || image;
        await pool.query('UPDATE boat_types SET name = $1, slug = $2, image = $3, icon = $4 WHERE id = $5', [name, slug, image, icon, id]);
        const { rows } = await pool.query('SELECT * FROM boat_types WHERE id = $1', [id]);
        res.json(rows[0]);
    } catch (err) { next(err); }
});

router.delete('/boat-types/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rowCount } = await pool.query('DELETE FROM boat_types WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Тип не найден' });
        res.json({ ok: true });
    } catch (err) { next(err); }
});

router.patch('/boat-types/reorder', async (req, res, next) => {
    try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x) => parseInt(x, 10)).filter((x) => !isNaN(x)) : [];
        if (ids.length === 0) return res.status(400).json({ error: 'Укажите порядок типов' });
        for (let i = 0; i < ids.length; i++) await pool.query('UPDATE boat_types SET sort_order = $1 WHERE id = $2', [i, ids[i]]);
        const { rows } = await pool.query('SELECT * FROM boat_types ORDER BY sort_order ASC, id ASC');
        res.json(rows);
    } catch (err) { next(err); }
});

router.get('/destinations', async (req, res, next) => {
    try {
        let { rows } = await pool.query('SELECT * FROM destinations ORDER BY sort_order ASC, id ASC');
        if (rows.length === 0) {
            const def = [['Москва','https://images.unsplash.com/photo-1513326738677-9646ab0f3b3b?w=400',0],['Санкт-Петербург','https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',1],['Сочи','https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=400',2],['Крым','https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400',3],['Казань','https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=400',4]];
            for (const [n,i,s] of def) await pool.query('INSERT INTO destinations (name, image, sort_order) VALUES ($1,$2,$3)', [n,i,s]);
            const r = await pool.query('SELECT * FROM destinations ORDER BY sort_order ASC, id ASC');
            rows = r.rows;
        }
        res.json(rows);
    } catch (err) { next(err); }
});

router.post('/destinations', upload.single('photo'), async (req, res, next) => {
    try {
        const name = (req.body?.name != null) ? String(req.body.name).trim() : '';
        if (!name) return res.status(400).json({ error: 'Укажите название направления' });
        const image = (req.file && (req.file.location || req.file.filename)) ? (req.file.location || '/uploads/' + path.basename(req.file.filename)) : '';
        const { rows } = await pool.query('INSERT INTO destinations (name, image, sort_order) VALUES ($1,$2,COALESCE((SELECT MAX(sort_order) FROM destinations),0)+1) RETURNING *', [name, image]);
        res.status(201).json(rows[0]);
    } catch (err) { next(err); }
});

router.put('/destinations/:id', upload.single('photo'), async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rows: ex } = await pool.query('SELECT * FROM destinations WHERE id = $1', [id]);
        if (ex.length === 0) return res.status(404).json({ error: 'Направление не найдено' });
        const name = (req.body?.name != null) ? String(req.body.name).trim() : (ex[0].name || '');
        let image = ex[0].image || '';
        if (req.file) image = req.file.location || '/uploads/' + path.basename(req.file.filename) || image;
        await pool.query('UPDATE destinations SET name = $1, image = $2 WHERE id = $3', [name, image, id]);
        const { rows } = await pool.query('SELECT * FROM destinations WHERE id = $1', [id]);
        res.json(rows[0]);
    } catch (err) { next(err); }
});

router.delete('/destinations/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rowCount } = await pool.query('DELETE FROM destinations WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Направление не найдено' });
        res.json({ ok: true });
    } catch (err) { next(err); }
});

router.patch('/destinations/reorder', async (req, res, next) => {
    try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x) => parseInt(x, 10)).filter((x) => !isNaN(x)) : [];
        if (ids.length === 0) return res.status(400).json({ error: 'Укажите порядок направлений' });
        for (let i = 0; i < ids.length; i++) await pool.query('UPDATE destinations SET sort_order = $1 WHERE id = $2', [i, ids[i]]);
        const { rows } = await pool.query('SELECT * FROM destinations ORDER BY sort_order ASC, id ASC');
        res.json(rows);
    } catch (err) { next(err); }
});

router.get('/amenities', async (req, res, next) => {
    try {
        const { rows } = await pool.query('SELECT * FROM amenities ORDER BY sort_order ASC, id ASC');
        res.json(rows);
    } catch (err) { next(err); }
});

router.post('/amenities', async (req, res, next) => {
    try {
        const name = (req.body?.name != null) ? String(req.body.name).trim() : '';
        if (!name) return res.status(400).json({ error: 'Укажите название удобства' });
        const { rows } = await pool.query(
            'INSERT INTO amenities (name, sort_order) VALUES ($1, COALESCE((SELECT MAX(sort_order) FROM amenities), -1) + 1) RETURNING *',
            [name]
        );
        res.status(201).json(rows[0]);
    } catch (err) { next(err); }
});

router.put('/amenities/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const name = (req.body?.name != null) ? String(req.body.name).trim() : '';
        if (!name) return res.status(400).json({ error: 'Укажите название удобства' });
        const { rows: ex } = await pool.query('SELECT * FROM amenities WHERE id = $1', [id]);
        if (ex.length === 0) return res.status(404).json({ error: 'Удобство не найдено' });
        await pool.query('UPDATE amenities SET name = $1 WHERE id = $2', [name, id]);
        const { rows } = await pool.query('SELECT * FROM amenities WHERE id = $1', [id]);
        res.json(rows[0]);
    } catch (err) { next(err); }
});

router.delete('/amenities/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rowCount } = await pool.query('DELETE FROM amenities WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Удобство не найдено' });
        res.json({ ok: true });
    } catch (err) { next(err); }
});

router.patch('/amenities/reorder', async (req, res, next) => {
    try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x) => parseInt(x, 10)).filter((x) => !isNaN(x)) : [];
        if (ids.length === 0) return res.status(400).json({ error: 'Укажите порядок удобств' });
        for (let i = 0; i < ids.length; i++) await pool.query('UPDATE amenities SET sort_order = $1 WHERE id = $2', [i, ids[i]]);
        const { rows } = await pool.query('SELECT * FROM amenities ORDER BY sort_order ASC, id ASC');
        res.json(rows);
    } catch (err) { next(err); }
});

router.patch('/users/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { name, first_name, last_name, email, phone, birthdate, about, address_line, address_city, address_street, address_zip, address_country, role, new_password } = req.body || {};

        const { rows: existing } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
        const user = existing[0];

        const sets = [];
        const vals = [];
        let idx = 1;
        if (email !== undefined && email !== user.email) {
            const { rows: dup } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
            if (dup.length > 0) return res.status(400).json({ error: 'Такой email уже занят' });
            sets.push(`email = $${idx++}`);
            vals.push(email);
        }
        if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name); }
        if (first_name !== undefined) { sets.push(`first_name = $${idx++}`); vals.push(first_name); }
        if (last_name !== undefined) { sets.push(`last_name = $${idx++}`); vals.push(last_name); }
        if (phone !== undefined) { sets.push(`phone = $${idx++}`); vals.push(phone); }
        if (birthdate !== undefined) { sets.push(`birthdate = $${idx++}`); vals.push(birthdate); }
        if (about !== undefined) { sets.push(`about = $${idx++}`); vals.push(about); }
        if (address_line !== undefined) { sets.push(`address_line = $${idx++}`); vals.push(address_line); }
        if (address_city !== undefined) { sets.push(`address_city = $${idx++}`); vals.push(address_city); }
        if (address_street !== undefined) { sets.push(`address_street = $${idx++}`); vals.push(address_street); }
        if (address_zip !== undefined) { sets.push(`address_zip = $${idx++}`); vals.push(address_zip); }
        if (address_country !== undefined) { sets.push(`address_country = $${idx++}`); vals.push(address_country); }
        if (role !== undefined && ['client', 'owner', 'admin'].includes(role)) { sets.push(`role = $${idx++}`); vals.push(role); }
        if (new_password !== undefined && String(new_password).trim()) {
            if (new_password.length < 3) return res.status(400).json({ error: 'Пароль минимум 3 символа' });
            const hash = await bcrypt.hash(new_password, 10);
            sets.push(`password_hash = $${idx++}`);
            vals.push(hash);
        }

        if (sets.length === 0) return res.json(user);

        vals.push(id);
        const { rows } = await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
        const { password_hash, ...safe } = rows[0];
        res.json(safe);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
