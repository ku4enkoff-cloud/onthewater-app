const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema } = require('../schemas');
const { generateToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');
const { sendVerificationEmail } = require('../services/email');

const router = express.Router();

const VERIFY_TOKEN_EXPIRES_HOURS = 24;

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
            const verifyToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + VERIFY_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000);

            const result = await client.query(
                `INSERT INTO users (email, phone, password_hash, name, role, email_verified, email_verify_token, email_verify_expires_at) 
                 VALUES ($1, $2, $3, $4, $5, FALSE, $6, $7) 
                 RETURNING id, email, name, role`,
                [email, phone || null, hash, name || email.split('@')[0], role || 'client', verifyToken, expiresAt]
            );

            const user = result.rows[0];
            const sent = await sendVerificationEmail(user.email, user.name, verifyToken);
            if (!sent) {
                console.warn('[auth] Не удалось отправить письмо подтверждения на', user.email);
            }

            res.status(201).json({
                message: 'Аккаунт создан. Подтвердите почту — на указанный email отправлено письмо со ссылкой.',
                email: user.email,
            });
        } finally {
            client.release();
        }
    } catch (err) {
        // Колонки email_verified, email_verify_token, email_verify_expires_at добавляются миграцией
        const code = err.code || '';
        const msg = (err.message || '').toLowerCase();
        if (code === '42703' || msg.includes('email_verified') || msg.includes('email_verify_token')) {
            console.error('[auth/register] Вероятно не выполнена миграция БД. Запустите: node src/migrate.js', err.message);
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
            'SELECT id, email, password_hash, name, role, first_name, last_name, phone, email_verified FROM users WHERE email = $1 OR phone = $1',
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

        if (user.email_verified === false) {
            return res.status(403).json({
                error: 'Подтвердите почту. На указанный при регистрации email отправлено письмо со ссылкой для активации аккаунта.',
                code: 'EMAIL_NOT_VERIFIED',
            });
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
