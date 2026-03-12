const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { upload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema } = require('../schemas');
const { generateToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
    const { email, phone, password, name, role } = req.body;

    try {
        const client = await pool.connect();
        try {
            const existCheck = await client.query('SELECT id FROM users WHERE email = $1 OR phone = $2', [email, phone]);
            if (existCheck.rows.length > 0) {
                return res.status(409).json({ error: 'Пользователь с таким email или телефоном уже существует' });
            }

            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);

            const result = await client.query(
                `INSERT INTO users (email, phone, password_hash, name, role, email_verified, email_verify_token, email_verify_expires_at) 
                 VALUES ($1, $2, $3, $4, $5, TRUE, NULL, NULL) 
                 RETURNING id, email, name, role, first_name, last_name, phone`,
                [email, phone || null, hash, name || email.split('@')[0], role || 'client']
            );

            const user = result.rows[0];
            const token = generateToken({ id: user.id, role: user.role });

            res.status(201).json({
                message: 'Аккаунт создан.',
                token,
                user,
            });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[auth/register]', err.code, err.message, err.detail || '');
        const code = err.code || '';
        const msg = (err.message || '').toLowerCase();
        if (code === '42703' || msg.includes('email_verified') || msg.includes('email_verify_token')) {
            return res.status(500).json({
                error: 'Ошибка настройки сервера. Администратору: выполните миграцию БД (node src/migrate.js).',
            });
        }
        next(err);
    }
});

router.get('/verify-email', async (req, res, next) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send(`
            <!DOCTYPE html><html><head><meta charset="utf-8"><title>Ошибка</title></head><body>
            <p>Не указан токен подтверждения.</p>
            </body></html>
        `);
    }
    try {
        const { rows } = await pool.query(
            'SELECT id, email FROM users WHERE email_verify_token = $1 AND email_verify_expires_at > NOW()',
            [token]
        );
        if (rows.length === 0) {
            return res.status(400).send(`
                <!DOCTYPE html><html><head><meta charset="utf-8"><title>Ошибка</title></head><body>
                <p>Ссылка недействительна или истекла. Запросите повторную отправку письма или зарегистрируйтесь снова.</p>
                </body></html>
            `);
        }
        await pool.query(
            'UPDATE users SET email_verified = TRUE, email_verify_token = NULL, email_verify_expires_at = NULL WHERE id = $1',
            [rows[0].id]
        );
        res.send(`
            <!DOCTYPE html><html><head><meta charset="utf-8"><title>Почта подтверждена</title></head><body>
            <h2>Почта подтверждена</h2>
            <p>Ваш аккаунт активирован. Теперь вы можете войти в приложение ONTHEWATER.</p>
            </body></html>
        `);
    } catch (err) {
        next(err);
    }
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
    const { email, login, password } = req.body;
    const loginValue = email || login;

    try {
        const result = await pool.query(
            'SELECT id, email, password_hash, name, role, first_name, last_name, phone, email_verified, avatar FROM users WHERE email = $1 OR phone = $1',
            [loginValue]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        const token = generateToken({ id: user.id, role: user.role });
        delete user.password_hash;
        delete user.email_verified;

        res.json({ token, user });
    } catch (err) {
        next(err);
    }
});

router.get('/me', authenticate, (req, res) => {
    res.json(req.user);
});

// Сохранение Expo Push Token для уведомлений (клиентское приложение)
router.post('/push-token', authenticate, async (req, res, next) => {
    try {
        const { push_token } = req.body || {};
        const token = typeof push_token === 'string' ? push_token.trim() : null;
        // Пустая строка или null — сбрасываем токен
        await pool.query(
            'UPDATE users SET push_token = $1 WHERE id = $2',
            [token || null, req.user.id]
        );
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

// Загрузка фото профиля (аватар)
router.post('/avatar', authenticate, upload.single('avatar'), async (req, res, next) => {
    try {
        const userId = req.user.id;
        const avatarPath = req.file && req.file.filename ? '/uploads/' + path.basename(req.file.filename) : null;
        if (!avatarPath) return res.status(400).json({ error: 'Файл не выбран' });
        const { rows } = await pool.query(
            'UPDATE users SET avatar = $1 WHERE id = $2 RETURNING id, email, name, first_name, last_name, phone, role, birthdate, about, address_line, address_city, address_zip, address_country, avatar, created_at',
            [avatarPath, userId]
        );
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

// Количество отзывов, оставленных текущим пользователем (для блока «Отзывы» в профиле)
router.get('/reviews-count', authenticate, async (req, res, next) => {
    try {
        const userId = parseInt(req.user.id, 10);
        if (Number.isNaN(userId)) return res.json({ count: 0 });
        const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM reviews WHERE user_id = $1', [userId]);
        res.json({ count: rows[0]?.count ?? 0 });
    } catch (err) {
        next(err);
    }
});

// Список отзывов текущего пользователя (для модалки «Мои отзывы»)
router.get('/reviews', authenticate, async (req, res, next) => {
    try {
        const userId = parseInt(req.user.id, 10);
        if (Number.isNaN(userId)) return res.json([]);
        const { rows } = await pool.query(
            `SELECT r.id, r.boat_id, r.rating, r.text, r.status, r.created_at, b.title AS boat_title
             FROM reviews r
             LEFT JOIN boats b ON b.id = r.boat_id
             WHERE r.user_id = $1
             ORDER BY r.created_at DESC`,
            [userId]
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

// Редактировать свой отзыв
router.patch('/reviews/:id', authenticate, async (req, res, next) => {
    try {
        const reviewId = parseInt(req.params.id, 10);
        const userId = parseInt(req.user.id, 10);
        if (Number.isNaN(reviewId)) return res.status(400).json({ error: 'Неверный id отзыва' });
        const { rows: existing } = await pool.query('SELECT id, boat_id, user_id FROM reviews WHERE id = $1', [reviewId]);
        if (existing.length === 0) return res.status(404).json({ error: 'Отзыв не найден' });
        if (parseInt(existing[0].user_id, 10) !== userId) return res.status(403).json({ error: 'Нельзя редактировать чужой отзыв' });
        const { rating, text } = req.body || {};
        const r = rating !== undefined ? Math.min(5, Math.max(1, parseInt(rating, 10) || 5)) : null;
        const textStr = text !== undefined ? (typeof text === 'string' ? text.trim() : '') : null;
        if (textStr !== null && textStr.length < 20) return res.status(400).json({ error: 'Текст отзыва должен быть не короче 20 символов' });
        const updates = [];
        const vals = [];
        let idx = 1;
        if (r !== null) { updates.push(`rating = $${idx++}`); vals.push(r); }
        if (textStr !== null) { updates.push(`text = $${idx++}`); vals.push(textStr); }
        if (updates.length === 0) {
            const { rows: out } = await pool.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);
            return res.json(out[0]);
        }
        vals.push(reviewId);
        const { rows: updated } = await pool.query(
            `UPDATE reviews SET ${updates.join(', ')}, status = 'pending' WHERE id = $${idx} RETURNING *`,
            vals
        );
        const boatId = existing[0].boat_id;
        await pool.query(
            `UPDATE boats SET rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE boat_id = $1 AND status = 'approved' AND COALESCE(spam,false) = false), 0), reviews_count = COALESCE((SELECT COUNT(*)::int FROM reviews WHERE boat_id = $1 AND status = 'approved' AND COALESCE(spam,false) = false), 0) WHERE id = $1`,
            [boatId]
        );
        res.json(updated[0]);
    } catch (err) {
        next(err);
    }
});

// Удалить свой отзыв
router.delete('/reviews/:id', authenticate, async (req, res, next) => {
    try {
        const reviewId = parseInt(req.params.id, 10);
        const userId = parseInt(req.user.id, 10);
        if (Number.isNaN(reviewId)) return res.status(400).json({ error: 'Неверный id отзыва' });
        const { rows: existing } = await pool.query('SELECT id, boat_id, user_id FROM reviews WHERE id = $1', [reviewId]);
        if (existing.length === 0) return res.status(404).json({ error: 'Отзыв не найден' });
        if (parseInt(existing[0].user_id, 10) !== userId) return res.status(403).json({ error: 'Нельзя удалить чужой отзыв' });
        const boatId = existing[0].boat_id;
        await pool.query('DELETE FROM reviews WHERE id = $1', [reviewId]);
        await pool.query(
            `UPDATE boats SET rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE boat_id = $1 AND status = 'approved' AND COALESCE(spam,false) = false), 0), reviews_count = COALESCE((SELECT COUNT(*)::int FROM reviews WHERE boat_id = $1 AND status = 'approved' AND COALESCE(spam,false) = false), 0) WHERE id = $1`,
            [boatId]
        );
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

router.patch('/profile', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { first_name, last_name, phone, birthdate, about, address_line, address_city, address_zip, address_country } = req.body || {};

        const sets = [];
        const vals = [];
        let idx = 1;
        const addField = (f, v) => { if (v !== undefined) { sets.push(`${f} = $${idx++}`); vals.push(v); } };
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
            sets.push(`name = $${idx++}`);
            vals.push([first_name !== undefined ? first_name : req.user.first_name || '', last_name !== undefined ? last_name : req.user.last_name || ''].filter(Boolean).join(' ').trim());
        }
        if (sets.length === 0) return res.json(req.user);
        vals.push(userId);
        const { rows } = await pool.query(
            `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, email, name, first_name, last_name, phone, birthdate, about, address_line, address_city, address_zip, address_country, role, created_at`,
            vals
        );
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

router.patch('/password', authenticate, async (req, res, next) => {
    try {
        const { current_password, new_password } = req.body || {};
        if (!current_password || !new_password) return res.status(400).json({ error: 'Укажите текущий и новый пароль' });
        const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
        const isMatch = await bcrypt.compare(current_password, rows[0].password_hash);
        if (!isMatch) return res.status(400).json({ error: 'Неверный текущий пароль' });
        if (new_password.length < 3) return res.status(400).json({ error: 'Новый пароль слишком короткий' });
        const hash = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
