const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool, initDB, seedData } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + ext);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

async function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const { rows } = await pool.query(
            `SELECT u.* FROM tokens t JOIN users u ON u.id = t.user_id WHERE t.token = $1`,
            [token],
        );
        if (rows.length === 0) return res.status(401).json({ error: 'Unauthorized' });
        req.user = rows[0];
        next();
    } catch (err) {
        console.error('Auth error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

function adminMiddleware(req, res, next) {
    if (req.user && req.user.role === 'admin') return next();
    return res.status(403).json({ error: 'Доступ только для администратора' });
}

// ——— Auth ———
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = rows[0];
        if (!user || password !== user.password) {
            return res.status(400).json({ error: 'Неверный логин или пароль' });
        }
        const token = 'tk_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        await pool.query('INSERT INTO tokens (token, user_id) VALUES ($1, $2)', [token, user.id]);
        const { password: _, ...safeUser } = user;
        res.json({ token, user: safeUser });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/auth/register', async (req, res) => {
    try {
        const { email, password, name, phone, role } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ error: 'Укажите email и пароль' });
        }
        const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Такой email уже зарегистрирован' });
        }
        const userRole = (role === 'owner') ? 'owner' : 'client';
        const { rows } = await pool.query(
            `INSERT INTO users (email, name, phone, role, password)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [email, name || email.split('@')[0], phone || '', userRole, password],
        );
        const user = rows[0];
        const token = 'tk_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        await pool.query('INSERT INTO tokens (token, user_id) VALUES ($1, $2)', [token, user.id]);
        const { password: _, ...safeUser } = user;
        res.json({ token, user: safeUser });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/auth/me', authMiddleware, (req, res) => {
    const { password, ...safeUser } = req.user;
    res.json(safeUser);
});

app.patch('/auth/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { first_name, last_name, phone, birthdate, about, address_line, address_city, address_zip, address_country } = req.body || {};

        const sets = [];
        const vals = [];
        let idx = 1;

        const addField = (field, value) => {
            if (value !== undefined) {
                sets.push(`${field} = $${idx++}`);
                vals.push(value);
            }
        };

        addField('first_name', first_name);
        addField('last_name', last_name);
        addField('phone', phone);
        addField('birthdate', birthdate);
        addField('about', about);
        addField('address_line', address_line);
        addField('address_city', address_city);
        addField('address_zip', address_zip);
        addField('address_country', address_country);

        if (first_name !== undefined || last_name !== undefined) {
            const fn = first_name !== undefined ? first_name : (req.user.first_name || '');
            const ln = last_name !== undefined ? last_name : (req.user.last_name || '');
            const fullName = [fn, ln].filter(Boolean).join(' ');
            sets.push(`name = $${idx++}`);
            vals.push(fullName);
        }

        if (sets.length === 0) {
            const { password, ...safeUser } = req.user;
            return res.json(safeUser);
        }

        vals.push(userId);
        const { rows } = await pool.query(
            `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
            vals,
        );
        const { password: _, ...safeUser } = rows[0];
        res.json(safeUser);
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.patch('/auth/password', authMiddleware, async (req, res) => {
    try {
        const { current_password, new_password } = req.body || {};
        if (!current_password || !new_password) return res.status(400).json({ error: 'Укажите текущий и новый пароль' });
        if (current_password !== req.user.password) return res.status(400).json({ error: 'Неверный текущий пароль' });
        if (new_password.length < 3) return res.status(400).json({ error: 'Новый пароль слишком короткий' });
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [new_password, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Password update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ——— Boats ———
app.get('/boats', async (req, res) => {
    try {
        const { lat, lng, radius, popular, limit } = req.query;
        const auth = req.headers.authorization;
        const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
        let user = null;
        if (token) {
            const { rows } = await pool.query(
                'SELECT u.* FROM tokens t JOIN users u ON u.id = t.user_id WHERE t.token = $1',
                [token],
            );
            if (rows.length > 0) user = rows[0];
        }

        let query, params;

        if (user && user.role === 'owner' && lat == null && lng == null && !popular) {
            query = 'SELECT * FROM boats WHERE status != $1 AND owner_id = $2 ORDER BY id';
            params = ['deleted', user.id];
        } else if (popular && (user == null || user.role !== 'owner')) {
            const lim = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
            query = `SELECT * FROM boats WHERE status != 'deleted'
                     ORDER BY COALESCE(bookings_count, 0) DESC, id
                     LIMIT $1`;
            params = [lim];
        } else if (lat != null && lng != null) {
            const latF = parseFloat(lat);
            const lngF = parseFloat(lng);
            if (radius) {
                query = `SELECT * FROM boats WHERE status != 'deleted'
                         AND (|/ ((lat - $1)^2 + (lng - $2)^2)) * 111 <= $3
                         ORDER BY id`;
                params = [latF, lngF, parseFloat(radius)];
            } else {
                query = `SELECT * FROM boats WHERE status != 'deleted' ORDER BY id`;
                params = [];
            }
        } else {
            query = `SELECT * FROM boats WHERE status != 'deleted' ORDER BY id`;
            params = [];
        }

        const { rows: boats } = await pool.query(query, params);
        res.json(boats);
    } catch (err) {
        console.error('Get boats error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/boats/cities', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT DISTINCT location_city AS city FROM boats 
             WHERE location_city IS NOT NULL 
             AND TRIM(COALESCE(location_city, '')) <> ''
             ORDER BY location_city`,
        );
        res.json(rows.map((r) => (r && r.city ? String(r.city).trim() : null)).filter(Boolean));
    } catch (err) {
        console.error('Get boats/cities error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/boats/:id', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM boats WHERE id = $1', [parseInt(req.params.id, 10)]);
        if (rows.length === 0) return res.status(404).json({ error: 'Катер не найден' });
        const boat = rows[0];
        const full = {
            manufacturer: '', model: '', year: '', location_country: '',
            location_address: '', location_yacht_club: '', rules: '', cancellation_policy: '',
            schedule_work_days: null, schedule_weekday_hours: null,
            schedule_weekend_hours: null, schedule_min_duration: 60,
            price_tiers: [], video_uris: [],
            ...boat,
        };
        res.json(full);
    } catch (err) {
        console.error('Get boat error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/boats/:id/reviews', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rows } = await pool.query('SELECT * FROM reviews WHERE boat_id = $1 ORDER BY created_at DESC', [id]);
        res.json(rows);
    } catch (err) {
        console.error('Get reviews error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/boats/:id/reviews', authMiddleware, async (req, res) => {
    try {
        const boatId = parseInt(req.params.id, 10);
        const user = req.user;
        const { rating, text } = req.body || {};
        const r = Math.min(5, Math.max(1, parseInt(rating, 10) || 5));
        const textStr = typeof text === 'string' ? text.trim() : '';

        const { rows: boatRows } = await pool.query('SELECT id FROM boats WHERE id = $1', [boatId]);
        if (boatRows.length === 0) return res.status(404).json({ error: 'Катер не найден' });

        const { rows: existing } = await pool.query(
            'SELECT id FROM reviews WHERE boat_id = $1 AND user_id = $2',
            [boatId, user.id],
        );
        if (existing.length > 0) return res.status(400).json({ error: 'Вы уже оставили отзыв на этот катер' });

        const { rows: inserted } = await pool.query(
            'INSERT INTO reviews (boat_id, user_id, user_name, rating, text) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [boatId, user.id, user.name || 'Гость', r, textStr || null],
        );

        await pool.query(
            `UPDATE boats SET
                rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE boat_id = $1),
                reviews_count = (SELECT COUNT(*) FROM reviews WHERE boat_id = $1)
            WHERE id = $1`,
            [boatId],
        );

        res.status(201).json(inserted[0]);
    } catch (err) {
        console.error('Post review error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/boats', authMiddleware, upload.array('photos', 10), async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'owner') return res.status(403).json({ error: 'Forbidden' });
        const body = req.body || {};
        const photoFiles = (req.files || []).map(f => '/uploads/' + path.basename(f.filename));
        const photos = photoFiles.length ? photoFiles : ['https://placehold.co/400x300/png'];
        let amenities = [];
        if (body.amenities) {
            try { amenities = typeof body.amenities === 'string' ? JSON.parse(body.amenities) : body.amenities; } catch (_) {}
        }

        const { rows } = await pool.query(`
            INSERT INTO boats (
                owner_id, owner_name, title, description, type_id, type_name,
                manufacturer, model, year, length_m, capacity,
                location_country, location_city, location_address, location_yacht_club,
                lat, lng, price_per_hour, price_per_day,
                captain_included, has_captain_option, rules, cancellation_policy,
                photos, amenities,
                schedule_work_days, schedule_weekday_hours, schedule_weekend_hours,
                schedule_min_duration, price_tiers, price_weekend, video_uris,
                status, rating, reviews_count, bookings_count
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36
            ) RETURNING *`,
            [
                user.id,
                user.name,
                body.title || 'Без названия',
                body.description || '',
                body.type_id || '1',
                body.type_name || 'Катер',
                body.manufacturer || '',
                body.model || '',
                body.year || '',
                body.length_m || '',
                body.capacity || '0',
                body.location_country || '',
                body.location_city || 'Москва',
                body.location_address || '',
                body.location_yacht_club || '',
                parseFloat(body.lat) || 55.75,
                parseFloat(body.lng) || 37.62,
                body.price_per_hour || '0',
                body.price_per_day || '',
                body.captain_included === '1',
                body.has_captain_option === '1',
                body.rules || '',
                body.cancellation_policy || '',
                JSON.stringify(photos),
                JSON.stringify(amenities),
                body.schedule_work_days ? body.schedule_work_days : null,
                body.schedule_weekday_hours ? body.schedule_weekday_hours : null,
                body.schedule_weekend_hours ? body.schedule_weekend_hours : null,
                body.schedule_min_duration ? parseInt(body.schedule_min_duration, 10) : 60,
                body.price_tiers || '[]',
                body.price_weekend !== undefined ? String(body.price_weekend).trim() : '',
                body.video_uris ? body.video_uris : '[]',
                'moderation', 0, 0, 0,
            ],
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Create boat error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.patch('/boats/:id', authMiddleware, upload.array('photos', 10), async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'owner') return res.status(403).json({ error: 'Нет прав на редактирование' });
        const id = parseInt(req.params.id, 10);
        const { rows: existing } = await pool.query('SELECT * FROM boats WHERE id = $1', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Катер не найден' });
        const boat = existing[0];
        if (boat.owner_id !== user.id) return res.status(403).json({ error: 'Нет прав на редактирование' });

        const body = req.body || {};
        let existingPhotos = [];
        if (body.photo_urls) {
            try { existingPhotos = JSON.parse(body.photo_urls); } catch (_) {}
        }
        if (!Array.isArray(existingPhotos)) existingPhotos = [];
        const newFiles = (req.files || []).map(f => '/uploads/' + path.basename(f.filename));
        const combinedPhotos = [...existingPhotos, ...newFiles];

        const sets = [];
        const vals = [];
        let idx = 1;

        const textFields = ['title', 'description', 'type_id', 'type_name', 'manufacturer', 'model', 'year', 'length_m', 'capacity', 'location_country', 'location_city', 'location_address', 'location_yacht_club', 'price_per_hour', 'price_per_day', 'price_weekend', 'rules', 'cancellation_policy'];
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

        if (sets.length === 0) return res.json(boat);

        vals.push(id);
        const { rows } = await pool.query(
            `UPDATE boats SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
            vals,
        );
        res.json(rows[0]);
    } catch (err) {
        console.error('Update boat error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/boats/:id', authMiddleware, async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== 'owner') return res.status(403).json({ error: 'Нет прав на удаление' });
        const id = parseInt(req.params.id, 10);
        const { rows } = await pool.query('SELECT * FROM boats WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Катер не найден' });
        if (rows[0].owner_id !== user.id) return res.status(403).json({ error: 'Нет прав на удаление' });

        const { rows: active } = await pool.query(
            `SELECT COUNT(*) FROM bookings WHERE boat_id = $1 AND status IN ('confirmed','pending')`,
            [id],
        );
        if (parseInt(active[0].count, 10) > 0) {
            return res.status(400).json({ error: 'Невозможно удалить катер с активными бронированиями. Сначала завершите или отмените все бронирования.' });
        }

        await pool.query(`UPDATE boats SET status = 'deleted' WHERE id = $1`, [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete boat error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ——— Bookings (client) ———
app.post('/bookings', authMiddleware, async (req, res) => {
    try {
        const { boat_id, start_at, hours, passengers, captain, total_price } = req.body || {};
        const { rows: boatRows } = await pool.query('SELECT * FROM boats WHERE id = $1', [parseInt(boat_id, 10)]);
        if (boatRows.length === 0) return res.status(404).json({ error: 'Катер не найден' });
        const boat = boatRows[0];

        const { rows } = await pool.query(`
            INSERT INTO bookings (user_id, owner_id, boat_id, boat_title, boat_photo, start_at, hours, passengers, captain, total_price, status)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING *`,
            [
                req.user.id, boat.owner_id, boat.id,
                boat.title, boat.photos?.[0] || '',
                start_at || new Date().toISOString(),
                hours || 3, passengers || 1, !!captain, total_price || 0, 'pending',
            ],
        );
        res.json(rows[0]);
    } catch (err) {
        console.error('Create booking error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/bookings', authMiddleware, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT b.*, boat.location_city, boat.location_address, boat.location_yacht_club
            FROM bookings b
            LEFT JOIN boats boat ON boat.id = b.boat_id
            WHERE b.user_id = $1
            ORDER BY b.created_at DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error('Get bookings error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/bookings/:id', authMiddleware, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT b.*, boat.location_city, boat.location_address, boat.location_yacht_club
            FROM bookings b
            LEFT JOIN boats boat ON boat.id = b.boat_id
            WHERE b.id = $1 AND b.user_id = $2
        `, [parseInt(req.params.id, 10), req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Get booking error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/bookings/:id/cancel', authMiddleware, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND user_id = $2 RETURNING *`,
            [parseInt(req.params.id, 10), req.user.id],
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ ok: true });
    } catch (err) {
        console.error('Cancel booking error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ——— Owner bookings ———
app.get('/owner/bookings', authMiddleware, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM bookings WHERE owner_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error('Get owner bookings error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/owner/bookings/:id/confirm', authMiddleware, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `UPDATE bookings SET status = 'confirmed' WHERE id = $1 AND owner_id = $2 RETURNING *`,
            [parseInt(req.params.id, 10), req.user.id],
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Confirm booking error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/owner/bookings/:id/decline', authMiddleware, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'DELETE FROM bookings WHERE id = $1 AND owner_id = $2 RETURNING id',
            [parseInt(req.params.id, 10), req.user.id],
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ ok: true });
    } catch (err) {
        console.error('Decline booking error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ——— Chats ———
app.get('/chats', authMiddleware, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM chats WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error('Get chats error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/chats/:id', authMiddleware, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM chats WHERE id = $1 AND (user_id = $2 OR owner_id = $2)',
            [parseInt(req.params.id, 10), req.user.id],
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Get chat error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/chats/:id/messages', authMiddleware, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at', [parseInt(req.params.id, 10)]);
        res.json(rows);
    } catch (err) {
        console.error('Get messages error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/chats/:id/messages', authMiddleware, async (req, res) => {
    try {
        const chatId = parseInt(req.params.id, 10);
        const { rows: chatRows } = await pool.query('SELECT * FROM chats WHERE id = $1', [chatId]);
        if (chatRows.length === 0) return res.status(404).json({ error: 'Not found' });
        const text = (req.body && req.body.text) || '';
        const sender = req.user.role === 'owner' ? 'owner' : 'me';

        const { rows } = await pool.query(
            `INSERT INTO messages (chat_id, text, sender, is_own) VALUES ($1, $2, $3, $4) RETURNING *`,
            [chatId, text, sender, true],
        );
        await pool.query('UPDATE chats SET last_message = $1 WHERE id = $2', [text, chatId]);
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/owner/chats', authMiddleware, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM chats WHERE owner_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error('Get owner chats error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ——— Admin API (веб-админка) ———
app.get('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM users ORDER BY id');
        res.json(rows);
    } catch (err) {
        console.error('Admin get users error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/admin/boats', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM boats WHERE status != 'deleted' ORDER BY id`);
        res.json(rows);
    } catch (err) {
        console.error('Admin get boats error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ——— Boat types (public + admin) ———
app.get('/boat-types', async (req, res) => {
    try {
        let { rows } = await pool.query('SELECT id, name, image, sort_order FROM boat_types ORDER BY sort_order ASC, id ASC');
        if (rows.length === 0) {
            for (const [name, image, sort_order] of DEFAULT_BOAT_TYPES) {
                await pool.query('INSERT INTO boat_types (name, image, sort_order) VALUES ($1, $2, $3)', [name, image, sort_order]);
            }
            const r = await pool.query('SELECT id, name, image, sort_order FROM boat_types ORDER BY sort_order ASC, id ASC');
            rows = r.rows;
        }
        res.json(rows);
    } catch (err) {
        console.error('Get boat-types error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const DEFAULT_BOAT_TYPES = [
    ['Парусная яхта', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400', 0],
    ['Яхта', 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=400', 1],
    ['Понтон', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400', 2],
    ['Катер', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400', 3],
    ['Буксировщик', 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=400', 4],
    ['Гидроцикл', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400', 5],
];

app.get('/admin/boat-types', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        let { rows } = await pool.query('SELECT * FROM boat_types ORDER BY sort_order ASC, id ASC');
        if (rows.length === 0) {
            for (const [name, image, sort_order] of DEFAULT_BOAT_TYPES) {
                await pool.query('INSERT INTO boat_types (name, image, sort_order) VALUES ($1, $2, $3)', [name, image, sort_order]);
            }
            const r = await pool.query('SELECT * FROM boat_types ORDER BY sort_order ASC, id ASC');
            rows = r.rows;
        }
        res.json(rows);
    } catch (err) {
        console.error('Admin get boat-types error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/admin/boat-types', authMiddleware, adminMiddleware, upload.single('photo'), async (req, res) => {
    try {
        const body = req.body || {};
        const name = (body.name != null) ? String(body.name).trim() : '';
        if (!name) return res.status(400).json({ error: 'Укажите название типа' });
        const image = (req.file && req.file.filename) ? '/uploads/' + path.basename(req.file.filename) : '';
        const { rows } = await pool.query(
            'INSERT INTO boat_types (name, image, sort_order) VALUES ($1, $2, COALESCE((SELECT MAX(sort_order) FROM boat_types), 0) + 1) RETURNING *',
            [name, image]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Admin create boat-type error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/admin/boat-types/:id', authMiddleware, adminMiddleware, upload.single('photo'), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Неверный ID' });
        const { rows: existing } = await pool.query('SELECT * FROM boat_types WHERE id = $1', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Тип не найден' });
        const body = req.body || {};
        const name = (body.name !== undefined && body.name !== null) ? String(body.name).trim() : (existing[0].name || '');
        let image = (existing[0].image != null ? String(existing[0].image) : '');
        if (req.file && req.file.filename) image = '/uploads/' + path.basename(req.file.filename);
        await pool.query('UPDATE boat_types SET name = $1, image = $2 WHERE id = $3', [name, image || '', id]);
        const { rows } = await pool.query('SELECT * FROM boat_types WHERE id = $1', [id]);
        res.json(rows[0]);
    } catch (err) {
        console.error('Admin update boat-type error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/admin/boat-types/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rowCount } = await pool.query('DELETE FROM boat_types WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Тип не найден' });
        res.json({ ok: true });
    } catch (err) {
        console.error('Admin delete boat-type error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.patch('/admin/boat-types/reorder', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x) => parseInt(x, 10)).filter((x) => !isNaN(x)) : [];
        if (ids.length === 0) return res.status(400).json({ error: 'Укажите порядок типов' });
        for (let i = 0; i < ids.length; i++) {
            await pool.query('UPDATE boat_types SET sort_order = $1 WHERE id = $2', [i, ids[i]]);
        }
        const { rows } = await pool.query('SELECT * FROM boat_types ORDER BY sort_order ASC, id ASC');
        res.json(rows);
    } catch (err) {
        console.error('Admin reorder boat-types error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ——— Destinations (popular places, public + admin) ———
const DEFAULT_DESTINATIONS = [
    ['Москва', 'https://images.unsplash.com/photo-1513326738677-9646ab0f3b3b?w=400', 0],
    ['Санкт-Петербург', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', 1],
    ['Сочи', 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=400', 2],
    ['Крым', 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400', 3],
    ['Казань', 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=400', 4],
];

app.get('/destinations', async (req, res) => {
    try {
        let { rows } = await pool.query('SELECT id, name, image, sort_order FROM destinations ORDER BY sort_order ASC, id ASC');
        if (rows.length === 0) {
            for (const [name, image, sort_order] of DEFAULT_DESTINATIONS) {
                await pool.query('INSERT INTO destinations (name, image, sort_order) VALUES ($1, $2, $3)', [name, image, sort_order]);
            }
            const r = await pool.query('SELECT id, name, image, sort_order FROM destinations ORDER BY sort_order ASC, id ASC');
            rows = r.rows;
        }
        res.json(rows);
    } catch (err) {
        console.error('Get destinations error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/admin/destinations', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        let { rows } = await pool.query('SELECT * FROM destinations ORDER BY sort_order ASC, id ASC');
        if (rows.length === 0) {
            for (const [name, image, sort_order] of DEFAULT_DESTINATIONS) {
                await pool.query('INSERT INTO destinations (name, image, sort_order) VALUES ($1, $2, $3)', [name, image, sort_order]);
            }
            const r = await pool.query('SELECT * FROM destinations ORDER BY sort_order ASC, id ASC');
            rows = r.rows;
        }
        res.json(rows);
    } catch (err) {
        console.error('Admin get destinations error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/admin/destinations', authMiddleware, adminMiddleware, upload.single('photo'), async (req, res) => {
    try {
        const body = req.body || {};
        const name = (body.name != null) ? String(body.name).trim() : '';
        if (!name) return res.status(400).json({ error: 'Укажите название направления' });
        const image = (req.file && req.file.filename) ? '/uploads/' + path.basename(req.file.filename) : '';
        const { rows } = await pool.query(
            'INSERT INTO destinations (name, image, sort_order) VALUES ($1, $2, COALESCE((SELECT MAX(sort_order) FROM destinations), 0) + 1) RETURNING *',
            [name, image]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Admin create destination error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/admin/destinations/:id', authMiddleware, adminMiddleware, upload.single('photo'), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Неверный ID' });
        const { rows: existing } = await pool.query('SELECT * FROM destinations WHERE id = $1', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Направление не найдено' });
        const body = req.body || {};
        const name = (body.name !== undefined && body.name !== null) ? String(body.name).trim() : (existing[0].name || '');
        let image = (existing[0].image != null ? String(existing[0].image) : '');
        if (req.file && req.file.filename) image = '/uploads/' + path.basename(req.file.filename);
        await pool.query('UPDATE destinations SET name = $1, image = $2 WHERE id = $3', [name, image || '', id]);
        const { rows } = await pool.query('SELECT * FROM destinations WHERE id = $1', [id]);
        res.json(rows[0]);
    } catch (err) {
        console.error('Admin update destination error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/admin/destinations/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { rowCount } = await pool.query('DELETE FROM destinations WHERE id = $1', [id]);
        if (rowCount === 0) return res.status(404).json({ error: 'Направление не найдено' });
        res.json({ ok: true });
    } catch (err) {
        console.error('Admin delete destination error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.patch('/admin/destinations/reorder', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x) => parseInt(x, 10)).filter((x) => !isNaN(x)) : [];
        if (ids.length === 0) return res.status(400).json({ error: 'Укажите порядок направлений' });
        for (let i = 0; i < ids.length; i++) {
            await pool.query('UPDATE destinations SET sort_order = $1 WHERE id = $2', [i, ids[i]]);
        }
        const { rows } = await pool.query('SELECT * FROM destinations ORDER BY sort_order ASC, id ASC');
        res.json(rows);
    } catch (err) {
        console.error('Admin reorder destinations error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/admin/bookings', authMiddleware, adminMiddleware, async (req, res) => {
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
        let boatIds = [...new Set(rawRows.map((r) => r.boat_id).filter(Boolean))];
        const boatsMap = {};
        if (boatIds.length > 0) {
            const { rows: boatRows } = await pool.query('SELECT id, title FROM boats WHERE id = ANY($1)', [boatIds]);
            boatRows.forEach((boat) => { boatsMap[boat.id] = boat.title; });
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
        console.error('Admin get bookings error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.patch('/admin/boats/:id', authMiddleware, adminMiddleware, async (req, res) => {
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
        console.error('Admin patch boat error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.patch('/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { name, email, role } = req.body || {};

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
        if (role !== undefined && ['client', 'owner', 'admin'].includes(role)) { sets.push(`role = $${idx++}`); vals.push(role); }

        if (sets.length === 0) return res.json(user);

        vals.push(id);
        const { rows } = await pool.query(
            `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
            vals,
        );
        res.json(rows[0]);
    } catch (err) {
        console.error('Admin patch user error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/admin/boats/:id', authMiddleware, adminMiddleware, upload.array('photos', 10), async (req, res) => {
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
            const newPaths = (req.files || []).map(f => '/uploads/' + path.basename(f.filename));
            const combined = [...ep, ...newPaths];
            const finalPhotos = combined.length ? combined : (boat.photos && boat.photos.length ? boat.photos : ['https://placehold.co/400x300?text=No+photo']);
            sets.push(`photos = $${idx++}`);
            vals.push(JSON.stringify(finalPhotos));
        }

        const textFields = ['title', 'description', 'type_id', 'type_name', 'manufacturer', 'model', 'year', 'length_m', 'capacity', 'location_country', 'location_city', 'location_address', 'location_yacht_club', 'price_per_hour', 'price_per_day', 'price_weekend', 'rules', 'cancellation_policy', 'status'];
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
        const { rows } = await pool.query(
            `UPDATE boats SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
            vals,
        );
        res.json(rows[0]);
    } catch (err) {
        console.error('Admin put boat error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.patch('/admin/bookings/:id', authMiddleware, adminMiddleware, async (req, res) => {
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
        const { rows } = await pool.query(
            `UPDATE bookings SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
            vals,
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Бронирование не найдено' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Admin patch booking error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Обработка ошибок (multer: LIMIT_FILE_SIZE и др.)
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Файл слишком большой (макс. 10 МБ)' });
    }
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: 'Ошибка загрузки фото: ' + (err.message || 'неизвестная ошибка') });
    }
    console.error(err);
    res.status(500).json({ error: err.message || 'Внутренняя ошибка сервера' });
});

(async () => {
    try {
        await initDB();
        console.log('Database tables initialized');
        await seedData();
        app.listen(PORT, () => {
            console.log(`BoatRent API: http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
})();
