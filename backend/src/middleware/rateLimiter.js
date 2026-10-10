const rateLimit = require('express-rate-limit');

/** Лимит на логин/регистрацию — защита от перебора паролей */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Слишком много попыток входа, пожалуйста, попробуйте позже' },
    standardHeaders: true,
    legacyHeaders: false,
});

/** Публичные GET каталога — сайт/приложение/SEO делают много параллельных запросов. */
function isPublicRead(req) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return false;
    const p = req.path || '';
    return (
        p === '/' ||
        p === '/health' ||
        p.startsWith('/boats') ||
        p.startsWith('/boat-types') ||
        p.startsWith('/destinations') ||
        p.startsWith('/legal-documents') ||
        p.startsWith('/uploads') ||
        p.startsWith('/suggest')
    );
}

/**
 * Мягкий лимит для публичного чтения.
 * По умолчанию 600 запросов / минуту с одного IP (было 300 / 15 мин на всё API).
 */
const publicReadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_PUBLIC_PER_MIN, 10) || 600,
    message: { error: 'Слишком много запросов. Попробуйте позже.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => !isPublicRead(req),
});

/**
 * Общий лимит на остальные API-методы (POST/PUT/DELETE и приватные GET).
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_PER_15MIN, 10) || 600,
    message: { error: 'Слишком много запросов. Попробуйте позже.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isPublicRead(req),
});

module.exports = { authLimiter, apiLimiter, publicReadLimiter, isPublicRead };
