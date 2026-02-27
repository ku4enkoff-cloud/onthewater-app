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
    const { login, password } = req.body;

    try {
        // login может быть как email, так и phone
        const result = await pool.query(
            'SELECT id, email, password_hash, name, role FROM users WHERE email = $1 OR phone = $1',
            [login]
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
        delete user.password_hash; // Не возвращаем хеш

        res.json({ user, token });
    } catch (err) {
        next(err);
    }
});

router.get('/me', authenticate, async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT id, email, phone, name, avatar, role, city, about, gims_number, rating, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
