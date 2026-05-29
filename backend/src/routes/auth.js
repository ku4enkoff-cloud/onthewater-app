const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../db');
const { upload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema, requestPasswordResetSchema, resetPasswordSchema } = require('../schemas');
const { generateToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');
const { sendPush } = require('../utils/push');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
    const { email, phone, password, name, role, accept_terms: acceptTerms } = req.body;
    const safeRole = role || 'client';
    if ((safeRole === 'client' || safeRole === 'owner') && !acceptTerms) {
        return res.status(400).json({
            error: 'Для регистрации необходимо принять Условия обслуживания и политики конфиденциальности.',
        });
    }

    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const existCheck = await client.query('SELECT id FROM users WHERE email = $1 OR phone = $2', [email, phone]);
            if (existCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({ error: 'Пользователь с таким email или телефоном уже существует' });
            }

            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            const requiresEmailVerification = safeRole === 'owner' || safeRole === 'client';
            const verificationToken = requiresEmailVerification ? crypto.randomBytes(32).toString('hex') : null;
            const termsAcceptedAt = acceptTerms ? new Date() : null;

            const result = await client.query(
                `INSERT INTO users (email, phone, password_hash, name, role, email_verified, email_verify_token, email_verify_expires_at, terms_accepted_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                 RETURNING id, email, name, role, first_name, last_name, phone, email_verified, terms_accepted_at`,
                [
                    email,
                    phone || null,
                    hash,
                    name || email.split('@')[0],
                    safeRole,
                    !requiresEmailVerification,
                    verificationToken,
                    requiresEmailVerification ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
                    termsAcceptedAt,
                ]
            );

            const user = result.rows[0];

            if (requiresEmailVerification) {
                const sent = await sendVerificationEmail(user.email, user.name || name || '', verificationToken);
                if (!sent) {
                    await client.query('ROLLBACK');
                    return res.status(500).json({
                        error: 'Не удалось отправить письмо для подтверждения email. Попробуйте позже.',
                    });
                }
                await client.query('COMMIT');
                return res.status(201).json({
                    message: 'Аккаунт создан. Мы отправили письмо с подтверждением на ваш email. Подтвердите почту, чтобы войти.',
                    requires_email_verification: true,
                });
            }

            const token = generateToken({ id: user.id, role: user.role });
            await client.query('COMMIT');

            res.status(201).json({
                message: 'Аккаунт создан.',
                token,
                user,
            });
        } catch (innerErr) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            throw innerErr;
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

// Восстановление пароля (для всех ролей, без авторизации)
router.post('/request-password-reset', authLimiter, validate(requestPasswordResetSchema), async (req, res, next) => {
    const { email } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return res.json({ message: 'Если аккаунт существует, мы отправили токен для восстановления.' });

    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const { rows } = await client.query('SELECT id, email, name FROM users WHERE email = $1', [normalizedEmail]);
            const user = rows[0];

            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 час

            if (user) {
                await client.query(
                    'INSERT INTO password_reset_tokens (user_id, email, token, expires_at) VALUES ($1, $2, $3, $4)',
                    [user.id, user.email, token, expiresAt]
                );

                const sent = await sendPasswordResetEmail(user.email, user.name || user.email.split('@')[0] || '', token);
                if (!sent) {
                    await client.query('ROLLBACK');
                    return res.status(500).json({ error: 'Не удалось отправить письмо для восстановления пароля. Попробуйте позже.' });
                }
            }

            await client.query('COMMIT');
            // Успех одинаковый, чтобы не раскрывать существование аккаунта
            res.json({ message: 'Если аккаунт существует, мы отправили токен для восстановления.' });
        } catch (innerErr) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            throw innerErr;
        } finally {
            client.release();
        }
    } catch (err) {
        next(err);
    }
});

router.post('/reset-password', validate(resetPasswordSchema), async (req, res, next) => {
    const { token, new_password } = req.body || {};
    const resetToken = String(token || '').trim();
    const newPass = String(new_password || '');

    if (!resetToken) return res.status(400).json({ error: 'Токен восстановления не указан' });

    try {
        const { rows } = await pool.query(
            'SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used = FALSE',
            [resetToken]
        );
        if (!rows || rows.length === 0) {
            return res.status(400).json({ error: 'Токен недействителен или истек.' });
        }

        const userId = rows[0].user_id;

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPass, salt);

        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
        await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [resetToken]);

        res.json({ message: 'Пароль успешно обновлён' });
    } catch (err) {
        next(err);
    }
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
    const { email, login, password } = req.body;
    const loginValue = email || login;

    try {
        const result = await pool.query(
            `SELECT id, email, password_hash, name, role, first_name, last_name, phone, email_verified,
                    email_verify_token, email_verify_expires_at, avatar, terms_accepted_at, suspended_at
             FROM users WHERE email = $1 OR phone = $1`,
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
        if (user.suspended_at) {
            return res.status(403).json({ error: 'Аккаунт ограничен модератором.' });
        }
        if ((user.role === 'owner' || user.role === 'client') && user.email_verified === false) {
            let verificationToken = user.email_verify_token;
            const expiresAt = user.email_verify_expires_at ? new Date(user.email_verify_expires_at) : null;
            const tokenExpired = !expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now();
            if (!verificationToken || tokenExpired) {
                verificationToken = crypto.randomBytes(32).toString('hex');
                await pool.query(
                    'UPDATE users SET email_verify_token = $1, email_verify_expires_at = $2 WHERE id = $3',
                    [verificationToken, new Date(Date.now() + 24 * 60 * 60 * 1000), user.id]
                );
            }
            const sent = await sendVerificationEmail(user.email, user.name || '', verificationToken);
            if (!sent) {
                return res.status(500).json({
                    error: 'Не удалось отправить письмо для подтверждения email. Попробуйте позже.',
                });
            }
            return res.status(403).json({
                error: 'Подтвердите email. Мы повторно отправили письмо со ссылкой для активации аккаунта.',
            });
        }

        const token = generateToken({ id: user.id, role: user.role });
        delete user.password_hash;
        delete user.email_verify_token;
        delete user.email_verify_expires_at;
        delete user.suspended_at;

        res.json({ token, user });
    } catch (err) {
        next(err);
    }
});

router.post('/accept-terms', authenticate, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `UPDATE users SET terms_accepted_at = COALESCE(terms_accepted_at, NOW())
             WHERE id = $1
             RETURNING id, email, name, role, first_name, last_name, phone, email_verified, avatar, terms_accepted_at`,
            [req.user.id]
        );
        res.json({ ok: true, user: rows[0] });
    } catch (err) {
        if (err.code === '42703') {
            return res.status(500).json({ error: 'Запустите миграцию БД (node src/migrate.js)' });
        }
        next(err);
    }
});

router.get('/me', authenticate, (req, res) => {
    res.json(req.user);
});

router.get('/notification-settings', authenticate, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT
                COALESCE(email_booking_notifications, TRUE) AS email_booking_notifications,
                COALESCE(email_message_notifications, TRUE) AS email_message_notifications,
                COALESCE(email_news_notifications, TRUE) AS email_news_notifications
             FROM users
             WHERE id = $1`,
            [req.user.id]
        );
        const row = rows[0] || {};
        res.json({
            email_booking_notifications: row.email_booking_notifications !== false,
            email_message_notifications: row.email_message_notifications !== false,
            email_news_notifications: row.email_news_notifications !== false,
        });
    } catch (err) {
        next(err);
    }
});

router.patch('/notification-settings', authenticate, async (req, res, next) => {
    try {
        const body = req.body || {};
        const hasEmailBooking = typeof body.email_booking_notifications === 'boolean';
        const hasEmailMessages = typeof body.email_message_notifications === 'boolean';
        const hasEmailNews = typeof body.email_news_notifications === 'boolean';

        if (!hasEmailBooking && !hasEmailMessages && !hasEmailNews) {
            return res.status(400).json({ error: 'Нет корректных полей для обновления' });
        }

        const sets = [];
        const vals = [];
        let idx = 1;
        if (hasEmailBooking) {
            sets.push(`email_booking_notifications = $${idx++}`);
            vals.push(body.email_booking_notifications);
        }
        if (hasEmailMessages) {
            sets.push(`email_message_notifications = $${idx++}`);
            vals.push(body.email_message_notifications);
        }
        if (hasEmailNews) {
            sets.push(`email_news_notifications = $${idx++}`);
            vals.push(body.email_news_notifications);
        }
        vals.push(req.user.id);

        const { rows } = await pool.query(
            `UPDATE users
             SET ${sets.join(', ')}
             WHERE id = $${idx}
             RETURNING
                COALESCE(email_booking_notifications, TRUE) AS email_booking_notifications,
                COALESCE(email_message_notifications, TRUE) AS email_message_notifications,
                COALESCE(email_news_notifications, TRUE) AS email_news_notifications`,
            vals
        );
        const row = rows[0] || {};
        res.json({
            email_booking_notifications: row.email_booking_notifications !== false,
            email_message_notifications: row.email_message_notifications !== false,
            email_news_notifications: row.email_news_notifications !== false,
        });
    } catch (err) {
        next(err);
    }
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

// Отправить тестовое push-уведомление текущему пользователю (для проверки)
router.post('/push-test', authenticate, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { rows } = await pool.query('SELECT push_token FROM users WHERE id = $1', [userId]);
        const token = rows[0]?.push_token;
        console.log('[push-test] user', userId, 'token =', token || 'NULL');
        if (!token) {
            return res.status(400).json({ error: 'Push-токен не зарегистрирован. Включите уведомления в приложении и перезайдите.' });
        }
        const result = await sendPush(token, 'ONTHEWATER', 'Тестовое уведомление — всё работает.', { type: 'test' });
        if (result.ok) {
            console.log('[push-test] Expo accepted notification for user', userId);
            return res.json({ ok: true, message: 'Уведомление отправлено.' });
        }
        console.warn('[push-test] Expo returned error for user', userId, result.error);
        const msg = result.details?.error === 'DeviceNotRegistered'
            ? 'Устройство не зарегистрировано в FCM. Включите push в настройках приложения и нажмите «Отправить тестовое уведомление» снова.'
            : (result.error || 'Ошибка отправки. Проверьте логи сервера.');
        res.json({ ok: false, message: msg });
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

// Удалить собственный аккаунт
router.delete('/account', authenticate, async (req, res, next) => {
    try {
        const userId = parseInt(req.user.id, 10);
        if (Number.isNaN(userId)) return res.status(400).json({ error: 'Неверный пользователь' });

        const u = req.user || {};
        const clientIp = (req.headers['x-forwarded-for'] || '')
            .toString()
            .split(',')[0]
            .trim() || req.ip || null;
        const userAgent = (req.headers['user-agent'] || '').toString().slice(0, 2000) || null;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                `INSERT INTO account_deletion_audits
                 (user_id, email, name, phone, role, user_created_at, ip_address, user_agent, source)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'self_service')`,
                [
                    userId,
                    u.email || null,
                    u.name || null,
                    u.phone || null,
                    u.role || null,
                    u.created_at || null,
                    clientIp,
                    userAgent,
                ]
            ).catch((auditErr) => {
                if (auditErr.code === '42P01') {
                    console.error('[auth/account] Таблица account_deletion_audits не найдена. Запустите: npm run db:migrate');
                } else {
                    console.error('[auth/account] Ошибка записи аудита:', auditErr.message);
                }
                throw auditErr;
            });

            // owner_id в chats не связан FK — удаляем вручную (messages удалятся по CASCADE)
            await client.query('DELETE FROM chats WHERE owner_id = $1', [userId]);

            // Бронирования владельца (дублируем явным удалением для legacy-случаев)
            await client.query('DELETE FROM bookings WHERE owner_id = $1', [userId]);

            // Клиенты владельца
            await client.query('DELETE FROM owner_clients WHERE owner_id = $1', [userId]).catch(() => {});

            // Отзывы пользователя (если оставлял как клиент)
            await client.query('DELETE FROM reviews WHERE user_id = $1', [userId]).catch(() => {});

            // Катера владельца (связанные бронирования/отзывы удалятся каскадно)
            await client.query('DELETE FROM boats WHERE owner_id = $1', [userId]);

            // Удаление самого аккаунта
            const { rowCount } = await client.query('DELETE FROM users WHERE id = $1', [userId]);
            if (rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            await client.query('COMMIT');
            res.json({ ok: true });
        } catch (err) {
            try { await client.query('ROLLBACK'); } catch (_) {}
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        next(err);
    }
});

module.exports = router;
