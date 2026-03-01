const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
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
            // Проверка существования
            const existCheck = await client.query('SELECT id FROM users WHERE email = $1 OR phone = $2', [email, phone]);
            if (existCheck.rows.length > 0) {
                return res.status(409).json({ error: 'Пользователь с таким email или телефоном уже существует' });
            }

            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);

            const result = await client.query(
                'INSERT INTO users (email, phone, password_hash, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role',
                [email, phone, hash, name, role || 'client']
            );

            const user = result.rows[0];
            const token = generateToken({ id: user.id, role: user.role });

            res.status(201).json({ user, token });
        } finally {
            client.release();
        }
    } catch (err) {
        next(err);
    }
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
    const { email, login, password } = req.body;
    const loginValue = email || login;

    try {
        const result = await pool.query(
            'SELECT id, email, password_hash, name, role, first_name, last_name, phone FROM users WHERE email = $1 OR phone = $1',
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
