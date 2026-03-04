const rateLimit = require('express-rate-limit');

/** Лимит на логин/регистрацию — защита от перебора паролей */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Слишком много попыток входа, пожалуйста, попробуйте позже' },
    standardHeaders: true,
    legacyHeaders: false,
});

/** Общий лимит на API — защита от флуда и простого DoS */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_PER_15MIN, 10) || 300,
    message: { error: 'Слишком много запросов. Попробуйте позже.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter };
